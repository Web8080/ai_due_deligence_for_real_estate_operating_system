# Author: Victor.I
from pathlib import Path
from typing import Dict, List
import csv
import io
import os

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openpyxl import load_workbook
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_or_create_company(
    db: Session,
    *,
    company_name: str | None,
    company_type: str = "investor",
    investor_type: str | None = None,
) -> models.Company | None:
    if not company_name:
        return None
    company = db.query(models.Company).filter(models.Company.name == company_name.strip()).first()
    if company:
        if investor_type and not company.investor_type:
            company.investor_type = investor_type
        return company
    company = models.Company(
        name=company_name.strip(),
        company_type=company_type,
        investor_type=investor_type,
    )
    db.add(company)
    db.flush()
    return company


def _build_analytics_summary(db: Session) -> schemas.AnalyticsSummary:
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


def _operations_summary(db: Session) -> schemas.WorkspaceOperationsSummary:
    high_priority_items: List[str] = []
    overdue_like_items: List[str] = []
    high_priority_deals = (
        db.query(models.Deal)
        .filter(models.Deal.priority == "high")
        .order_by(models.Deal.id.desc())
        .limit(5)
        .all()
    )
    for deal in high_priority_deals:
        high_priority_items.append(
            f"Deal #{deal.id} {deal.name} is marked high priority and next action is {deal.next_action or 'not set'}."
        )
    open_diligence = (
        db.query(models.DiligenceItem)
        .filter(models.DiligenceItem.status != "done")
        .order_by(models.DiligenceItem.id.desc())
        .limit(5)
        .all()
    )
    for item in open_diligence:
        overdue_like_items.append(
            f"Diligence item '{item.title}' for deal #{item.deal_id} remains {item.status} with severity {item.severity}."
        )
    return schemas.WorkspaceOperationsSummary(
        high_priority_items=high_priority_items,
        overdue_like_items=overdue_like_items,
    )


def _seed_demo_records(db: Session) -> schemas.DemoSeedResponse:
    if db.query(models.Deal).count() > 0:
        return schemas.DemoSeedResponse(
            deals_created=db.query(models.Deal).count(),
            contacts_created=db.query(models.Contact).count(),
            investor_pipeline_entries_created=db.query(models.InvestorPipelineEntry).count(),
        )

    stage_templates = [
        ("Maple Grove Multifamily", "Screening", "multifamily", "Dallas", "TX", "Broker referral", "high"),
        ("West Loop Office", "Due Diligence", "office", "Chicago", "IL", "Direct outreach", "high"),
        ("Harbor Logistics Park", "Investment Committee", "industrial", "Savannah", "GA", "Broker referral", "medium"),
        ("Sunset Retail Center", "Lead", "retail", "Phoenix", "AZ", "Inbound", "medium"),
        ("Riverfront Hotel", "Approved", "hospitality", "Nashville", "TN", "Broker referral", "high"),
        ("Civic Medical Plaza", "Due Diligence", "medical office", "Austin", "TX", "Seller network", "high"),
        ("Pine Distribution Hub", "Screening", "industrial", "Memphis", "TN", "Inbound", "medium"),
        ("Northshore Self Storage", "Lead", "self storage", "Tampa", "FL", "Cold outreach", "low"),
        ("Broadway Mixed Use", "Rejected", "mixed use", "New York", "NY", "Broker referral", "medium"),
        ("Lakeside Senior Living", "Screening", "senior housing", "Charlotte", "NC", "Inbound", "high"),
        ("Mission Bay Lab Space", "Due Diligence", "life sciences", "San Diego", "CA", "Direct outreach", "medium"),
        ("Capitol Hill Residential", "Investment Committee", "multifamily", "Seattle", "WA", "Broker referral", "high"),
    ]
    deal_records = []
    for idx, (name, stage, asset_type, city, state, source, priority) in enumerate(stage_templates, start=1):
        deal = models.Deal(
            name=name,
            stage=stage,
            description=f"{asset_type.title()} opportunity in {city} requiring structured diligence and investor coordination.",
            asset_type=asset_type,
            city=city,
            state=state,
            source=source,
            priority=priority,
            owner_name="analyst1" if idx % 2 else "manager1",
            next_action="Review diligence pack" if stage != "Approved" else "Prepare closing handoff",
        )
        db.add(deal)
        db.flush()
        db.add(
            models.DealStageEvent(
                deal_id=deal.id,
                from_stage=None,
                to_stage=stage,
                reason="Seeded local MVP workflow state",
                author="system",
            )
        )
        for item_idx in range(3):
            db.add(
                models.DiligenceItem(
                    deal_id=deal.id,
                    title=f"{name} diligence item {item_idx + 1}",
                    status="open" if item_idx == 0 else "in_review",
                    severity="high" if item_idx == 0 and priority == "high" else "medium",
                    owner_name="analyst1" if item_idx % 2 == 0 else "manager1",
                    notes="Follow up with seller or legal counsel for missing support.",
                )
            )
        db.add(
            models.Document(
                deal_id=deal.id,
                filename=f"{name.lower().replace(' ', '_')}_summary.txt",
                document_type="offering_memo",
                status="processed",
                summary=f"{name} summary generated for local MVP demo.",
                risk_tags="lease rollover,capex",
                content=f"{name} contains lease rollover exposure and capital planning items that should be reviewed.",
            )
        )
        deal_records.append(deal)

    company_templates = [
        ("Northbridge Capital", "investor", "family office"),
        ("Elm Street Partners", "investor", "private equity"),
        ("Harborview Advisors", "investor", "fund of funds"),
        ("Summit Brokerage", "broker", None),
        ("Atlas Legal", "legal", None),
        ("Stonebank Lending", "lender", None),
        ("Blue Pine Capital", "investor", "institutional"),
        ("Crescent Family Office", "investor", "family office"),
    ]
    companies = {}
    for name, company_type, investor_type in company_templates:
        company = _get_or_create_company(
            db,
            company_name=name,
            company_type=company_type,
            investor_type=investor_type,
        )
        companies[name] = company

    contacts_created = 0
    investor_entries_created = 0
    statuses = ["target", "contacted", "interested", "passed", "committed"]
    for idx in range(24):
        company_name = list(companies.keys())[idx % len(companies)]
        company = companies[company_name]
        contact = models.Contact(
            full_name=f"Contact {idx + 1}",
            email=f"contact{idx + 1}@example.com",
            contact_type="investor" if company.company_type == "investor" else company.company_type,
            title="Principal" if company.company_type == "investor" else "Partner",
            phone=f"+1-555-010-{idx:02d}",
            investor_type=company.investor_type,
            company_id=company.id,
            deal_id=deal_records[idx % len(deal_records)].id,
            notes="Imported or seeded contact for local MVP review.",
        )
        db.add(contact)
        db.flush()
        contacts_created += 1
        if company.company_type == "investor":
            db.add(
                models.InvestorPipelineEntry(
                    deal_id=deal_records[idx % len(deal_records)].id,
                    contact_id=contact.id,
                    status=statuses[idx % len(statuses)],
                    commitment_amount=250000 * ((idx % 4) + 1),
                    conviction="high" if idx % 3 == 0 else "medium",
                    last_signal="Opened teaser and requested follow-up" if idx % 2 == 0 else "Awaiting reply",
                    next_action="Schedule follow-up call" if idx % 2 == 0 else "Send diligence memo",
                )
            )
            investor_entries_created += 1

    db.commit()
    return schemas.DemoSeedResponse(
        deals_created=len(deal_records),
        contacts_created=contacts_created,
        investor_pipeline_entries_created=investor_entries_created,
    )


def _integration_status_snapshot() -> schemas.IntegrationStatus:
    runtime_mode = os.getenv("REOS_RUNTIME_MODE", "local").strip().lower()
    azure_blob_configured = bool(os.getenv("REOS_AZURE_STORAGE_ACCOUNT") and os.getenv("REOS_AZURE_STORAGE_CONTAINER"))
    azure_ad_configured = bool(
        os.getenv("REOS_AZURE_TENANT_ID") and os.getenv("REOS_AZURE_CLIENT_ID") and os.getenv("REOS_AZURE_AUDIENCE")
    )
    azure_key_vault_configured = bool(os.getenv("REOS_AZURE_KEY_VAULT_URL"))
    azure_front_door_configured = bool(os.getenv("REOS_AZURE_FRONT_DOOR_HOST"))
    azure_app_gateway_configured = bool(os.getenv("REOS_AZURE_APP_GATEWAY_HOST"))
    azure_api_management_configured = bool(os.getenv("REOS_AZURE_APIM_NAME"))
    azure_service_bus_configured = bool(
        os.getenv("REOS_AZURE_SERVICE_BUS_NAMESPACE") and os.getenv("REOS_AZURE_SERVICE_BUS_QUEUE")
    )
    azure_ai_search_configured = bool(
        os.getenv("REOS_AZURE_AI_SEARCH_ENDPOINT") and os.getenv("REOS_AZURE_AI_SEARCH_INDEX")
    )
    azure_functions_configured = bool(os.getenv("REOS_AZURE_FUNCTIONS_APP"))
    return schemas.IntegrationStatus(
        runtime_mode=runtime_mode,
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
        azure_front_door_configured=azure_front_door_configured,
        azure_app_gateway_configured=azure_app_gateway_configured,
        azure_api_management_configured=azure_api_management_configured,
        azure_service_bus_configured=azure_service_bus_configured,
        azure_ai_search_configured=azure_ai_search_configured,
        azure_functions_configured=azure_functions_configured,
        automation_mode=os.getenv("REOS_AUTOMATION_MODE", "assistive"),
    )


def _integration_preferences(db: Session) -> Dict[str, bool]:
    preferences = db.query(models.IntegrationPreference).all()
    return {item.key: bool(item.enabled) for item in preferences}


def _integration_definitions(status: schemas.IntegrationStatus) -> list[dict]:
    return [
        {
            "key": "azure_openai",
            "label": "Azure OpenAI",
            "category": "ai",
            "connected": status.azure_openai_configured,
            "mode": "live",
            "placeholder": False,
            "api_ready": True,
            "auth_type": "api_key",
            "summary": "Enterprise LLM and embeddings provider for governed AI mode.",
            "required_env_vars": [
                "REOS_AZURE_OPENAI_ENDPOINT",
                "REOS_AZURE_OPENAI_API_KEY",
                "REOS_AZURE_OPENAI_CHAT_DEPLOYMENT",
                "REOS_AZURE_OPENAI_EMBED_DEPLOYMENT",
            ],
            "config_fields": [
                {"key": "endpoint", "label": "Endpoint", "value_hint": "https://<resource>.openai.azure.com"},
                {"key": "chat_deployment", "label": "Chat deployment", "value_hint": "gpt-4o"},
                {"key": "embed_deployment", "label": "Embed deployment", "value_hint": "text-embedding-3-large"},
            ],
            "notes": ["Used when REOS runtime mode is switched to Azure.", "Pairs with AI Search for grounded retrieval."],
            "last_test_result": "Readiness is derived from env var checks.",
        },
        {
            "key": "azure_blob_storage",
            "label": "Azure Blob Storage",
            "category": "data",
            "connected": status.azure_blob_configured,
            "mode": "live",
            "placeholder": False,
            "api_ready": True,
            "auth_type": "connection_string",
            "summary": "Document storage target for enterprise document ingestion.",
            "required_env_vars": ["REOS_AZURE_STORAGE_ACCOUNT", "REOS_AZURE_STORAGE_CONTAINER"],
            "config_fields": [
                {"key": "account", "label": "Storage account", "value_hint": "reosstorageprod"},
                {"key": "container", "label": "Container", "value_hint": "deal-documents"},
            ],
            "notes": ["Currently modeled for readiness only.", "Future uploads should be dual-wired behind a storage adapter."],
            "last_test_result": "Env var presence check only.",
        },
        {
            "key": "azure_ai_search",
            "label": "Azure AI Search",
            "category": "ai",
            "connected": status.azure_ai_search_configured,
            "mode": "live",
            "placeholder": False,
            "api_ready": True,
            "auth_type": "api_key",
            "summary": "Managed vector retrieval target for enterprise search and RAG.",
            "required_env_vars": ["REOS_AZURE_AI_SEARCH_ENDPOINT", "REOS_AZURE_AI_SEARCH_INDEX"],
            "config_fields": [
                {"key": "endpoint", "label": "Search endpoint", "value_hint": "https://<search>.search.windows.net"},
                {"key": "index", "label": "Index name", "value_hint": "reos-documents"},
            ],
            "notes": ["Will replace local chunk retrieval at enterprise scale."],
            "last_test_result": "Env var presence check only.",
        },
        {
            "key": "azure_service_bus",
            "label": "Azure Service Bus",
            "category": "operations",
            "connected": status.azure_service_bus_configured,
            "mode": "live",
            "placeholder": False,
            "api_ready": True,
            "auth_type": "connection_string",
            "summary": "Queue backbone for asynchronous document and automation processing.",
            "required_env_vars": ["REOS_AZURE_SERVICE_BUS_NAMESPACE", "REOS_AZURE_SERVICE_BUS_QUEUE"],
            "config_fields": [
                {"key": "namespace", "label": "Namespace", "value_hint": "reos-ops-bus"},
                {"key": "queue", "label": "Queue", "value_hint": "document-ingestion"},
            ],
            "notes": ["Pairs with Functions for event-driven processing."],
            "last_test_result": "Env var presence check only.",
        },
        {
            "key": "microsoft_entra_id",
            "label": "Microsoft Entra ID",
            "category": "security",
            "connected": status.azure_ad_configured,
            "mode": "live",
            "placeholder": False,
            "api_ready": True,
            "auth_type": "oauth",
            "summary": "Enterprise identity provider for future SSO and role mapping.",
            "required_env_vars": ["REOS_AZURE_TENANT_ID", "REOS_AZURE_CLIENT_ID", "REOS_AZURE_AUDIENCE"],
            "config_fields": [
                {"key": "tenant_id", "label": "Tenant ID", "value_hint": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"},
                {"key": "client_id", "label": "Client ID", "value_hint": "application registration id"},
            ],
            "notes": ["Current auth is still local token based.", "This placeholder helps shape future SSO testing."],
            "last_test_result": "Env var presence check only.",
        },
        {
            "key": "microsoft_graph",
            "label": "Microsoft Graph",
            "category": "communications",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "oauth",
            "summary": "Email, contacts, and calendar ingestion for investor and internal workflow automation.",
            "required_env_vars": ["REOS_GRAPH_CLIENT_ID", "REOS_GRAPH_CLIENT_SECRET", "REOS_GRAPH_TENANT_ID"],
            "config_fields": [
                {"key": "mailbox_scope", "label": "Mailbox scope", "value_hint": "shared mailbox or user mailbox"},
                {"key": "tenant_id", "label": "Tenant ID", "value_hint": "Azure tenant id"},
                {"key": "client_secret", "label": "Client secret", "value_hint": "stored in env or vault", "secret": True},
            ],
            "notes": [
                "Use for investor contact import, meeting sync, and email signal detection.",
                "Displayed as a placeholder until API integration is implemented.",
            ],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
        {
            "key": "gmail",
            "label": "Gmail",
            "category": "communications",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "oauth",
            "summary": "Alternative email ingestion path for firms outside Microsoft 365.",
            "required_env_vars": ["REOS_GMAIL_CLIENT_ID", "REOS_GMAIL_CLIENT_SECRET"],
            "config_fields": [
                {"key": "workspace_domain", "label": "Workspace domain", "value_hint": "firm.com"},
                {"key": "client_secret", "label": "Client secret", "value_hint": "stored in env or vault", "secret": True},
            ],
            "notes": ["Mirrors Graph use cases with Gmail and Google Calendar."],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
        {
            "key": "slack",
            "label": "Slack",
            "category": "operations",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "bot_token",
            "summary": "Alerting and workflow notifications for diligence and investor events.",
            "required_env_vars": ["REOS_SLACK_BOT_TOKEN", "REOS_SLACK_SIGNING_SECRET"],
            "config_fields": [
                {"key": "channel", "label": "Default channel", "value_hint": "#reos-ops"},
                {"key": "bot_token", "label": "Bot token", "value_hint": "xoxb-...", "secret": True},
            ],
            "notes": ["Good first notification placeholder for QA and product review."],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
        {
            "key": "docusign",
            "label": "DocuSign",
            "category": "signatures",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "oauth",
            "summary": "Signature workflow integration for closings, approvals, and subscription documents.",
            "required_env_vars": ["REOS_DOCUSIGN_CLIENT_ID", "REOS_DOCUSIGN_ACCOUNT_ID"],
            "config_fields": [
                {"key": "account_id", "label": "Account ID", "value_hint": "DocuSign account id"},
                {"key": "template_set", "label": "Template set", "value_hint": "closing-pack-v1"},
            ],
            "notes": ["Placeholder for legal and closing workflow testing."],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
        {
            "key": "alloy",
            "label": "Alloy",
            "category": "compliance",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "api_key",
            "summary": "KYC and compliance verification placeholder for investor onboarding.",
            "required_env_vars": ["REOS_ALLOY_API_KEY", "REOS_ALLOY_WORKFLOW_TOKEN"],
            "config_fields": [
                {"key": "workflow_token", "label": "Workflow token", "value_hint": "kyc-investor-v1"},
                {"key": "api_key", "label": "API key", "value_hint": "stored in env or vault", "secret": True},
            ],
            "notes": ["Useful for onboarding and compliance workflow demos before vendor setup."],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
        {
            "key": "juniper_square",
            "label": "Juniper Square",
            "category": "investor_systems",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "api_key",
            "summary": "Investor onboarding and reporting system placeholder.",
            "required_env_vars": ["REOS_JUNIPER_SQUARE_API_KEY"],
            "config_fields": [
                {"key": "workspace_id", "label": "Workspace ID", "value_hint": "fund-admin-workspace"},
                {"key": "api_key", "label": "API key", "value_hint": "stored in env or vault", "secret": True},
            ],
            "notes": ["Represents future LP onboarding and reporting integration."],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
        {
            "key": "yardi",
            "label": "Yardi",
            "category": "market_data",
            "connected": False,
            "mode": "placeholder",
            "placeholder": True,
            "api_ready": False,
            "auth_type": "api_key",
            "summary": "Property and operational data placeholder for asset management and reporting.",
            "required_env_vars": ["REOS_YARDI_CLIENT_ID", "REOS_YARDI_CLIENT_SECRET"],
            "config_fields": [
                {"key": "property_scope", "label": "Property scope", "value_hint": "portfolio or asset ids"},
                {"key": "client_secret", "label": "Client secret", "value_hint": "stored in env or vault", "secret": True},
            ],
            "notes": ["Structured as a placeholder until downstream property systems are selected."],
            "last_test_result": "Placeholder only. No live connectivity yet.",
        },
    ]


def _integration_catalog_status(definition: dict, enabled: bool) -> str:
    if definition["placeholder"]:
        return "mock_enabled" if enabled else "placeholder"
    if definition["connected"] and enabled:
        return "connected"
    if definition["connected"] and not enabled:
        return "configured"
    return "missing_config"


def _build_integration_catalog(db: Session) -> schemas.IntegrationCatalogResponse:
    status = _integration_status_snapshot()
    preferences = _integration_preferences(db)
    items = []
    for definition in _integration_definitions(status):
        default_enabled = definition["connected"] if not definition["placeholder"] else False
        enabled = preferences.get(definition["key"], default_enabled)
        items.append(
            schemas.IntegrationCatalogItem(
                key=definition["key"],
                label=definition["label"],
                category=definition["category"],
                status=_integration_catalog_status(definition, enabled),
                enabled=enabled,
                connected=definition["connected"],
                mode=definition["mode"],
                placeholder=definition["placeholder"],
                api_ready=definition["api_ready"],
                auth_type=definition["auth_type"],
                summary=definition["summary"],
                notes=definition["notes"],
                config_fields=[schemas.IntegrationConfigField(**field) for field in definition["config_fields"]],
                required_env_vars=definition["required_env_vars"],
                last_test_result=definition["last_test_result"],
            )
        )
    return schemas.IntegrationCatalogResponse(items=items)


def _decode_csv_rows(file_bytes: bytes) -> list[dict[str, str]]:
    text = file_bytes.decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text)))


def _decode_spreadsheet_rows(filename: str, file_bytes: bytes) -> list[dict[str, str]]:
    if filename.lower().endswith(".xlsx"):
        workbook = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
        sheet = workbook.active
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(cell).strip() if cell is not None else "" for cell in rows[0]]
        parsed_rows: list[dict[str, str]] = []
        for row in rows[1:]:
            parsed_rows.append(
                {
                    headers[idx]: "" if value is None else str(value)
                    for idx, value in enumerate(row)
                    if idx < len(headers) and headers[idx]
                }
            )
        return parsed_rows
    return _decode_csv_rows(file_bytes)


def _import_deals_contacts(db: Session, rows: list[dict[str, str]]) -> int:
    imported = 0
    for row in rows:
        deal = (
            db.query(models.Deal)
            .filter(models.Deal.name == (row.get("deal_name") or "").strip())
            .first()
        )
        if not deal:
            deal = models.Deal(
                name=(row.get("deal_name") or "").strip(),
                description=row.get("description"),
                asset_type=row.get("asset_type"),
                city=row.get("city"),
                state=row.get("state"),
                source=row.get("source"),
                priority=(row.get("priority") or "medium").strip() or "medium",
                owner_name=row.get("owner_name"),
                next_action=row.get("next_action"),
            )
            db.add(deal)
            db.flush()
            db.add(
                models.DealStageEvent(
                    deal_id=deal.id,
                    from_stage=None,
                    to_stage=deal.stage,
                    reason="Imported from CSV",
                    author="importer",
                )
            )
        company = _get_or_create_company(
            db,
            company_name=row.get("company_name"),
            company_type=row.get("contact_type") or "investor",
            investor_type=row.get("investor_type"),
        )
        email = (row.get("contact_email") or "").strip()
        contact = db.query(models.Contact).filter(models.Contact.email == email).first() if email else None
        if not contact:
            contact = models.Contact(
                full_name=(row.get("contact_full_name") or "").strip(),
                email=email or None,
                contact_type=(row.get("contact_type") or "investor").strip() or "investor",
                company_id=company.id if company else None,
                investor_type=row.get("investor_type"),
                deal_id=deal.id,
            )
            db.add(contact)
        imported += 1
    db.commit()
    return imported


def _import_investor_pipeline(db: Session, rows: list[dict[str, str]]) -> int:
    imported = 0
    for row in rows:
        deal_name = (row.get("deal_name") or "").strip()
        email = (row.get("contact_email") or "").strip()
        deal = db.query(models.Deal).filter(models.Deal.name == deal_name).first()
        contact = db.query(models.Contact).filter(models.Contact.email == email).first() if email else None
        if not deal or not contact:
            continue
        entry = (
            db.query(models.InvestorPipelineEntry)
            .filter(
                models.InvestorPipelineEntry.deal_id == deal.id,
                models.InvestorPipelineEntry.contact_id == contact.id,
            )
            .first()
        )
        if not entry:
            entry = models.InvestorPipelineEntry(
                deal_id=deal.id,
                contact_id=contact.id,
            )
            db.add(entry)
        entry.status = (row.get("status") or "target").strip() or "target"
        entry.commitment_amount = int((row.get("commitment_amount") or "0").strip() or "0")
        entry.conviction = (row.get("conviction") or "medium").strip() or "medium"
        entry.last_signal = row.get("last_signal")
        entry.next_action = row.get("next_action")
        imported += 1
    db.commit()
    return imported


def _import_document_index(db: Session, rows: list[dict[str, str]]) -> int:
    imported = 0
    for row in rows:
        deal_name = (row.get("deal_name") or "").strip()
        deal = db.query(models.Deal).filter(models.Deal.name == deal_name).first()
        if not deal:
            continue
        document = models.Document(
            deal_id=deal.id,
            filename=(row.get("filename") or "imported_document.txt").strip(),
            document_type=(row.get("document_type") or "general").strip() or "general",
            status="processed",
            summary=row.get("summary"),
            risk_tags=row.get("risk_tags"),
            content=row.get("content") or row.get("summary") or "Imported document metadata row.",
        )
        db.add(document)
        imported += 1
    db.commit()
    return imported


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
    identity: tuple = Depends(require_auth),
) -> models.Deal:
    username, _ = identity
    deal = models.Deal(
        name=payload.name,
        description=payload.description,
        asset_type=payload.asset_type,
        city=payload.city,
        state=payload.state,
        source=payload.source,
        priority=payload.priority or "medium",
        owner_name=payload.owner_name or username,
        next_action=payload.next_action,
    )
    db.add(deal)
    db.flush()
    db.add(
        models.DealStageEvent(
            deal_id=deal.id,
            from_stage=None,
            to_stage=deal.stage,
            reason="Deal created",
            author=username,
        )
    )
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
    identity: tuple = Depends(require_auth),
) -> models.Deal:
    username, _ = identity
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    previous_stage = deal.stage
    deal.stage = payload.stage
    db.add(
        models.DealStageEvent(
            deal_id=deal.id,
            from_stage=previous_stage,
            to_stage=payload.stage,
            reason="Stage updated from dashboard",
            author=username,
        )
    )
    db.commit()
    db.refresh(deal)
    return deal


@app.post("/crm/contacts", response_model=schemas.ContactOut)
def create_contact(
    payload: schemas.ContactCreate,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> models.Contact:
    company = _get_or_create_company(
        db,
        company_name=payload.company_name,
        company_type=payload.contact_type if payload.contact_type != "investor" else "investor",
        investor_type=payload.investor_type,
    )
    contact = models.Contact(
        full_name=payload.full_name,
        email=payload.email,
        contact_type=payload.contact_type,
        title=payload.title,
        phone=payload.phone,
        investor_type=payload.investor_type,
        company_id=company.id if company else None,
        deal_id=payload.deal_id,
        notes=payload.notes,
    )
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

    summary = " ".join(content.split()[:40]).strip()
    document = models.Document(
        deal_id=deal_id,
        filename=file.filename,
        document_type="uploaded_file",
        status="processed",
        summary=summary,
        risk_tags="review_required",
        content=content,
    )
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
    return _build_analytics_summary(db)


@app.post("/demo/seed", response_model=schemas.DemoSeedResponse)
def demo_seed(db: Session = Depends(get_db), _: tuple = Depends(require_auth)) -> schemas.DemoSeedResponse:
    return _seed_demo_records(db)


@app.get("/workspace/bootstrap", response_model=schemas.WorkspaceBootstrapResponse)
def workspace_bootstrap(
    db: Session = Depends(get_db), _: tuple = Depends(require_auth)
) -> schemas.WorkspaceBootstrapResponse:
    deals = db.query(models.Deal).order_by(models.Deal.id.desc()).limit(25).all()
    contacts = db.query(models.Contact).order_by(models.Contact.id.desc()).limit(50).all()
    investor_pipeline = (
        db.query(models.InvestorPipelineEntry)
        .order_by(models.InvestorPipelineEntry.id.desc())
        .limit(50)
        .all()
    )
    return schemas.WorkspaceBootstrapResponse(
        analytics=_build_analytics_summary(db),
        deals=deals,
        contacts=contacts,
        investor_pipeline=investor_pipeline,
        operations=_operations_summary(db),
    )


@app.get("/deals/{deal_id}/workspace", response_model=schemas.DealWorkspaceResponse)
def deal_workspace(
    deal_id: int,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> schemas.DealWorkspaceResponse:
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    documents = (
        db.query(models.Document)
        .filter(models.Document.deal_id == deal_id)
        .order_by(models.Document.id.desc())
        .all()
    )
    diligence_items = (
        db.query(models.DiligenceItem)
        .filter(models.DiligenceItem.deal_id == deal_id)
        .order_by(models.DiligenceItem.id.desc())
        .all()
    )
    stage_events = (
        db.query(models.DealStageEvent)
        .filter(models.DealStageEvent.deal_id == deal_id)
        .order_by(models.DealStageEvent.id.desc())
        .all()
    )
    notes = (
        db.query(models.DealNote)
        .filter(models.DealNote.deal_id == deal_id)
        .order_by(models.DealNote.id.desc())
        .limit(30)
        .all()
    )
    ai_history = (
        db.query(models.AIQueryLog)
        .filter(models.AIQueryLog.deal_id == deal_id)
        .order_by(models.AIQueryLog.id.desc())
        .limit(20)
        .all()
    )
    investor_pipeline = (
        db.query(models.InvestorPipelineEntry)
        .filter(models.InvestorPipelineEntry.deal_id == deal_id)
        .order_by(models.InvestorPipelineEntry.id.desc())
        .all()
    )
    summary_lines = [
        f"Current stage: {deal.stage}",
        f"Priority: {deal.priority}",
        f"Next action: {deal.next_action or 'not set'}",
        f"Open diligence items: {sum(1 for item in diligence_items if item.status != 'done')}",
        f"Tracked investors: {len(investor_pipeline)}",
    ]
    return schemas.DealWorkspaceResponse(
        deal=deal,
        documents=documents,
        diligence_items=diligence_items,
        stage_events=stage_events,
        notes=notes,
        ai_history=ai_history,
        investor_pipeline=investor_pipeline,
        operations_summary=summary_lines,
    )


@app.post("/imports/csv", response_model=schemas.CsvImportResponse)
async def import_csv_file(
    import_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> schemas.CsvImportResponse:
    rows = _decode_spreadsheet_rows(file.filename or "import.csv", await file.read())
    normalized_type = import_type.strip().lower()
    if normalized_type == "deals_contacts":
        imported = _import_deals_contacts(db, rows)
    elif normalized_type == "investor_pipeline":
        imported = _import_investor_pipeline(db, rows)
    elif normalized_type == "document_index":
        imported = _import_document_index(db, rows)
    else:
        raise HTTPException(status_code=400, detail="Unsupported import_type")
    return schemas.CsvImportResponse(import_type=normalized_type, rows_imported=imported)


@app.get("/integrations/catalog", response_model=schemas.IntegrationCatalogResponse)
def integrations_catalog(
    db: Session = Depends(get_db), _: tuple = Depends(require_auth)
) -> schemas.IntegrationCatalogResponse:
    return _build_integration_catalog(db)


@app.post("/integrations/catalog/toggle", response_model=schemas.IntegrationToggleResponse)
def toggle_integration_catalog_item(
    payload: schemas.IntegrationToggleRequest,
    db: Session = Depends(get_db),
    _: tuple = Depends(require_auth),
) -> schemas.IntegrationToggleResponse:
    valid_keys = {item["key"] for item in _integration_definitions(_integration_status_snapshot())}
    requested_key = payload.key.strip().lower()
    if requested_key not in valid_keys:
        raise HTTPException(status_code=404, detail="Integration not found")
    preference = db.query(models.IntegrationPreference).filter(models.IntegrationPreference.key == requested_key).first()
    if not preference:
        preference = models.IntegrationPreference(key=requested_key, enabled=payload.enabled)
        db.add(preference)
    else:
        preference.enabled = payload.enabled
    db.commit()
    return schemas.IntegrationToggleResponse(
        key=requested_key,
        enabled=payload.enabled,
        message="Integration toggle updated.",
    )


@app.get("/integrations/status", response_model=schemas.IntegrationStatus)
def integrations_status(_: tuple = Depends(require_auth)) -> schemas.IntegrationStatus:
    return _integration_status_snapshot()


@app.post("/integrations/mode", response_model=schemas.IntegrationModeUpdateResponse)
def update_integration_mode(
    payload: schemas.IntegrationModeUpdateRequest, _: tuple = Depends(require_auth)
) -> schemas.IntegrationModeUpdateResponse:
    requested = payload.mode.strip().lower()
    if requested not in {"local", "azure"}:
        raise HTTPException(status_code=400, detail="Mode must be either local or azure")
    os.environ["REOS_RUNTIME_MODE"] = requested
    if requested == "azure":
        os.environ["REOS_AI_PROVIDER"] = "azure_openai"
        message = "Azure runtime mode enabled. This is a config-level switch only."
    else:
        os.environ["REOS_AI_PROVIDER"] = "ollama"
        message = "Local runtime mode enabled. Azure integrations remain available for status checks."
    return schemas.IntegrationModeUpdateResponse(mode=requested, ai_provider=current_ai_provider(), message=message)


@app.get("/architecture/azure", response_model=schemas.AzureArchitectureResponse)
def azure_architecture(_: tuple = Depends(require_auth)) -> schemas.AzureArchitectureResponse:
    nodes = [
        schemas.AzureArchitectureNode(id="users", label="Users / Analysts", layer="edge", runtime="client"),
        schemas.AzureArchitectureNode(id="front_door", label="Azure Front Door", layer="edge", runtime="managed"),
        schemas.AzureArchitectureNode(id="app_gateway", label="Azure App Gateway", layer="edge", runtime="managed"),
        schemas.AzureArchitectureNode(id="api_mgmt", label="API Management", layer="api", runtime="managed"),
        schemas.AzureArchitectureNode(id="deal_service", label="Deal Service", layer="services", runtime="app_service"),
        schemas.AzureArchitectureNode(id="crm_service", label="CRM Service", layer="services", runtime="app_service"),
        schemas.AzureArchitectureNode(
            id="document_service", label="Document Service", layer="services", runtime="app_service"
        ),
        schemas.AzureArchitectureNode(id="blob_storage", label="Azure Blob Storage", layer="storage", runtime="managed"),
        schemas.AzureArchitectureNode(id="service_bus", label="Azure Service Bus", layer="messaging", runtime="managed"),
        schemas.AzureArchitectureNode(
            id="doc_processing", label="Document Processing", layer="processing", runtime="azure_functions"
        ),
        schemas.AzureArchitectureNode(
            id="embedding", label="Embedding Generation", layer="processing", runtime="azure_functions"
        ),
        schemas.AzureArchitectureNode(id="ai_search", label="Azure AI Search", layer="retrieval", runtime="managed"),
        schemas.AzureArchitectureNode(id="azure_openai", label="Azure OpenAI", layer="ai", runtime="managed"),
        schemas.AzureArchitectureNode(id="insights", label="AI Analysis Layer", layer="ai", runtime="app_service"),
    ]
    edges = [
        schemas.AzureArchitectureEdge(source="users", target="front_door", flow="HTTPS"),
        schemas.AzureArchitectureEdge(source="front_door", target="app_gateway", flow="WAF routing"),
        schemas.AzureArchitectureEdge(source="app_gateway", target="api_mgmt", flow="North-South API traffic"),
        schemas.AzureArchitectureEdge(source="api_mgmt", target="deal_service", flow="Deal API"),
        schemas.AzureArchitectureEdge(source="api_mgmt", target="crm_service", flow="CRM API"),
        schemas.AzureArchitectureEdge(source="api_mgmt", target="document_service", flow="Document API"),
        schemas.AzureArchitectureEdge(source="document_service", target="blob_storage", flow="Document write/read"),
        schemas.AzureArchitectureEdge(source="document_service", target="service_bus", flow="Ingestion event"),
        schemas.AzureArchitectureEdge(source="service_bus", target="doc_processing", flow="Queue trigger"),
        schemas.AzureArchitectureEdge(source="doc_processing", target="embedding", flow="Chunked text"),
        schemas.AzureArchitectureEdge(source="embedding", target="ai_search", flow="Vector upsert"),
        schemas.AzureArchitectureEdge(source="ai_search", target="azure_openai", flow="Retrieved context"),
        schemas.AzureArchitectureEdge(source="azure_openai", target="insights", flow="Grounded outputs"),
    ]
    return schemas.AzureArchitectureResponse(
        title="REOS Azure Enterprise Architecture",
        notes=[
            "This view models production topology while preserving local-first development.",
            "Mode switching is config-level and does not provision or tear down Azure resources.",
            "Service Bus and Functions isolate heavy asynchronous document processing.",
        ],
        nodes=nodes,
        edges=edges,
        deployment_stages=["Prototype", "Internal Testing", "Production"],
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
