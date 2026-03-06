# Author: Victor.I
from pathlib import Path
from typing import List
import os

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from . import models, schemas
from .auth import create_default_admin, hash_password, issue_token, require_auth, verify_password
from .database import Base, SessionLocal, engine, get_db
from .ocr import extract_text
from .rag import chunk_text, current_ai_provider, embed_text, generate_grounded_answer, retrieve_top_chunks, store_chunks

Base.metadata.create_all(bind=engine)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="REOS API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)) -> schemas.LoginResponse:
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return schemas.LoginResponse(username=user.username, token=issue_token(user.username, user.role), role=user.role)


@app.post("/auth/signup", response_model=schemas.SignupResponse)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)) -> schemas.SignupResponse:
    if payload.role not in {"admin", "manager", "analyst"}:
        raise HTTPException(status_code=400, detail="Role must be one of: admin, manager, analyst")
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    user = models.User(username=payload.username, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    return schemas.SignupResponse(username=user.username, role=user.role)


@app.get("/auth/me", response_model=schemas.MeResponse)
def auth_me(identity: tuple = Depends(require_auth)) -> schemas.MeResponse:
    username, role = identity
    return schemas.MeResponse(username=username, role=role)


@app.post("/deals", response_model=schemas.DealOut)
def create_deal(
    payload: schemas.DealCreate,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> models.Deal:
    deal = models.Deal(name=payload.name, description=payload.description)
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal


@app.get("/deals", response_model=List[schemas.DealOut])
def list_deals(db: Session = Depends(get_db), _: tuple = Depends(require_auth)) -> List[models.Deal]:
    return db.query(models.Deal).order_by(models.Deal.id.desc()).all()


@app.patch("/deals/{deal_id}/stage", response_model=schemas.DealOut)
def update_stage(
    deal_id: int,
    payload: schemas.DealUpdateStage,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> models.Deal:
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    deal.stage = payload.stage
    db.commit()
    db.refresh(deal)
    return deal


@app.post("/crm/contacts", response_model=schemas.ContactOut)
def create_contact(
    payload: schemas.ContactCreate,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> models.Contact:
    contact = models.Contact(**payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@app.get("/crm/contacts", response_model=List[schemas.ContactOut])
def list_contacts(db: Session = Depends(get_db), _: tuple = Depends(require_auth)) -> List[models.Contact]:
    return db.query(models.Contact).order_by(models.Contact.id.desc()).all()


@app.get("/documents/deal/{deal_id}", response_model=List[schemas.DocumentOut])
def list_deal_documents(
    deal_id: int,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> List[models.Document]:
    return (
        db.query(models.Document)
        .filter(models.Document.deal_id == deal_id)
        .order_by(models.Document.id.desc())
        .all()
    )


@app.post("/documents/{deal_id}/upload", response_model=schemas.DocumentOut)
async def upload_document(
    deal_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> models.Document:
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    target = UPLOAD_DIR / file.filename
    with target.open("wb") as f:
        f.write(await file.read())

    try:
        content = extract_text(target).strip()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not content:
        raise HTTPException(status_code=400, detail="No extractable text from document")

    document = models.Document(deal_id=deal_id, filename=file.filename, content=content)
    db.add(document)
    db.commit()
    db.refresh(document)

    chunks = chunk_text(content)
    embeddings = []
    for c in chunks:
        embeddings.append((c, await embed_text(c)))
    store_chunks(db, deal_id, document.id, embeddings)
    return document


@app.post("/ai/query/{deal_id}", response_model=schemas.QueryResponse)
async def query_deal(
    deal_id: int,
    payload: schemas.QueryRequest,
    db: Session = Depends(get_db),
    identity: tuple = Depends(require_auth),
) -> schemas.QueryResponse:
    username, _role = identity
    query_embedding = await embed_text(payload.question)
    chunks = retrieve_top_chunks(db, deal_id, query_embedding)
    if not chunks:
        return schemas.QueryResponse(answer="Insufficient evidence for this deal.", citations=[])
    answer = await generate_grounded_answer(payload.question, chunks)
    citations = [f"doc:{c.document_id}/chunk:{c.id}" for c in chunks]
    log = models.AIQueryLog(
        deal_id=deal_id,
        username=username,
        question=payload.question,
        answer=answer,
        citations=",".join(citations),
    )
    db.add(log)
    db.commit()
    return schemas.QueryResponse(answer=answer, citations=citations)


@app.get("/ai/history/{deal_id}", response_model=List[schemas.AIQueryLogOut])
def ai_history(
    deal_id: int,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> List[models.AIQueryLog]:
    return (
        db.query(models.AIQueryLog)
        .filter(models.AIQueryLog.deal_id == deal_id)
        .order_by(models.AIQueryLog.id.desc())
        .limit(20)
        .all()
    )


@app.post("/deals/{deal_id}/notes", response_model=schemas.DealNoteOut)
def add_deal_note(
    deal_id: int,
    payload: schemas.DealNoteCreate,
    db: Session = Depends(get_db),
    identity: tuple = Depends(require_auth),
) -> models.DealNote:
    username, _ = identity
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    note = models.DealNote(deal_id=deal_id, author=username, content=payload.content.strip())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@app.get("/deals/{deal_id}/notes", response_model=List[schemas.DealNoteOut])
def list_deal_notes(
    deal_id: int,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> List[models.DealNote]:
    return (
        db.query(models.DealNote)
        .filter(models.DealNote.deal_id == deal_id)
        .order_by(models.DealNote.id.desc())
        .limit(30)
        .all()
    )


@app.get("/analytics/summary", response_model=schemas.AnalyticsSummary)
def analytics_summary(db: Session = Depends(get_db), _: tuple = Depends(require_auth)) -> schemas.AnalyticsSummary:
    total_deals = db.query(models.Deal).count()
    total_contacts = db.query(models.Contact).count()
    total_documents = db.query(models.Document).count()
    rows = db.query(models.Deal.stage, func.count(models.Deal.id)).group_by(models.Deal.stage).all()
    stage_distribution = {stage: count for stage, count in rows}
    return schemas.AnalyticsSummary(
        total_deals=total_deals,
        total_contacts=total_contacts,
        total_documents=total_documents,
        stage_distribution=stage_distribution,
    )


@app.get("/integrations/status", response_model=schemas.IntegrationStatus)
def integrations_status(_: tuple = Depends(require_auth)) -> schemas.IntegrationStatus:
    azure_blob_configured = bool(
        os.getenv("REOS_AZURE_STORAGE_ACCOUNT") and os.getenv("REOS_AZURE_STORAGE_CONTAINER")
    )
    azure_ad_configured = bool(
        os.getenv("REOS_AZURE_TENANT_ID")
        and os.getenv("REOS_AZURE_CLIENT_ID")
        and os.getenv("REOS_AZURE_AUDIENCE")
    )
    azure_key_vault_configured = bool(os.getenv("REOS_AZURE_KEY_VAULT_URL"))
    return schemas.IntegrationStatus(
        ai_provider=current_ai_provider(),
        azure_openai_configured=bool(
            os.getenv("REOS_AZURE_OPENAI_ENDPOINT")
            and os.getenv("REOS_AZURE_OPENAI_API_KEY")
            and os.getenv("REOS_AZURE_OPENAI_CHAT_DEPLOYMENT")
            and os.getenv("REOS_AZURE_OPENAI_EMBED_DEPLOYMENT")
        ),
        azure_blob_configured=azure_blob_configured,
        azure_ad_configured=azure_ad_configured,
        azure_key_vault_configured=azure_key_vault_configured,
        automation_mode=os.getenv("REOS_AUTOMATION_MODE", "assistive"),
    )


@app.get("/automation/recommendations", response_model=schemas.AutomationRecommendationsResponse)
def automation_recommendations(
    db: Session = Depends(get_db), _: tuple = Depends(require_auth)
) -> schemas.AutomationRecommendationsResponse:
    total_deals = db.query(models.Deal).count()
    total_documents = db.query(models.Document).count()
    open_diligence = (
        db.query(models.Deal)
        .filter(models.Deal.stage.in_(["Screening", "Due Diligence", "Investment Committee"]))
        .count()
    )
    recommendations = [
        schemas.AutomationRecommendation(
            id="auto-risk-triage",
            title="Automate first-pass risk triage",
            impact="high",
            effort="medium",
            description="Run document-level risk tags immediately after upload and route high-risk deals to managers.",
            risk_if_ignored="Analysts spend time on low-risk files while critical issues wait in queue.",
        ),
        schemas.AutomationRecommendation(
            id="auto-stage-gates",
            title="Enforce stage gate checks automatically",
            impact="high",
            effort="low",
            description="Prevent stage transitions unless required artifacts and notes are present.",
            risk_if_ignored="Deals can progress without diligence evidence, creating audit and investment risk.",
        ),
        schemas.AutomationRecommendation(
            id="auto-digest",
            title="Send daily diligence digest",
            impact="medium",
            effort="low",
            description="Generate summary by owner: new docs, unresolved risks, and stage blockers.",
            risk_if_ignored="Leadership lacks consistent operational visibility and misses aging work.",
        ),
    ]
    challenges = [
        "Identity and RBAC mapping to existing Azure AD groups can cause permission drift if unmanaged.",
        "Model governance is required when mixing local Ollama and Azure OpenAI to avoid inconsistent outputs.",
        "Data residency and legal hold requirements may restrict where documents and embeddings can be stored.",
        "Automation without confidence thresholds can flood teams with false positives and alert fatigue.",
        "Legacy process dependencies in email/spreadsheets can block adoption unless workflow parity is planned.",
    ]
    if total_deals > 100 or total_documents > 300 or open_diligence > 40:
        recommendations.append(
            schemas.AutomationRecommendation(
                id="auto-capacity-balancing",
                title="Add workload balancing by analyst capacity",
                impact="high",
                effort="medium",
                description="Auto-assign incoming diligence tasks by queue depth, role, and SLA due dates.",
                risk_if_ignored="Backlog and turnaround time increase unevenly across teams.",
            )
        )
    return schemas.AutomationRecommendationsResponse(recommendations=recommendations, challenges=challenges)
