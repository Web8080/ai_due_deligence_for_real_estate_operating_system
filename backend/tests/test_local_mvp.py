# Author: Victor.I
import os
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

os.environ["REOS_ENABLE_LOCAL_BOOTSTRAP"] = "true"
os.environ["REOS_LOCAL_LOGIN_ENABLED"] = "true"
os.environ["REOS_SESSION_SECRET"] = "test-session-secret-that-is-long-enough-12345"

from backend.app.auth import create_default_admin
from backend.app.database import Base, SessionLocal, engine
from backend.app.main import app

client = TestClient(app)


def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def _auth_headers():
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()
    login = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_demo_seed_populates_workspace_bootstrap():
    _reset_db()
    headers = _auth_headers()

    seed = client.post("/demo/seed", headers=headers)
    assert seed.status_code == 200
    seed_payload = seed.json()
    assert seed_payload["deals_created"] >= 10
    assert "workflow_tasks_added" in seed_payload
    assert seed_payload["contacts_created"] >= 20
    assert seed_payload["investor_pipeline_entries_created"] >= 10

    bootstrap = client.get("/workspace/bootstrap", headers=headers)
    assert bootstrap.status_code == 200
    payload = bootstrap.json()

    assert payload["analytics"]["total_deals"] >= 10
    assert len(payload["deals"]) >= 10
    assert len(payload["contacts"]) >= 20
    assert len(payload["investor_pipeline"]) >= 10
    assert len(payload["operations"]["high_priority_items"]) > 0


def test_csv_import_supports_deals_contacts_investors_and_documents():
    _reset_db()
    headers = _auth_headers()

    deals_csv = (
        "deal_name,description,asset_type,city,state,source,priority,owner_name,next_action,contact_full_name,"
        "contact_email,contact_type,company_name,investor_type\n"
        "Union Station Office,Core office deal,office,Denver,CO,Broker referral,high,analyst1,"
        "Review OM,Jordan Vale,jordan@example.com,investor,Peak River Capital,family office\n"
    )
    deals_import = client.post(
        "/imports/csv?import_type=deals_contacts",
        headers=headers,
        files={"file": ("deals.csv", deals_csv.encode("utf-8"), "text/csv")},
    )
    assert deals_import.status_code == 200
    deals_payload = deals_import.json()
    assert deals_payload["rows_imported"] == 1

    investor_csv = (
        "deal_name,contact_email,status,commitment_amount,conviction,last_signal,next_action\n"
        "Union Station Office,jordan@example.com,interested,500000,high,Requested IC memo,Schedule call\n"
    )
    investor_import = client.post(
        "/imports/csv?import_type=investor_pipeline",
        headers=headers,
        files={"file": ("investors.csv", investor_csv.encode("utf-8"), "text/csv")},
    )
    assert investor_import.status_code == 200
    investor_payload = investor_import.json()
    assert investor_payload["rows_imported"] == 1

    docs_csv = (
        "deal_name,filename,document_type,summary,risk_tags,content\n"
        "Union Station Office,union_station_om.txt,offering_memo,Core office summary,lease_roll,Sample OM text\n"
    )
    docs_import = client.post(
        "/imports/csv?import_type=document_index",
        headers=headers,
        files={"file": ("documents.csv", docs_csv.encode("utf-8"), "text/csv")},
    )
    assert docs_import.status_code == 200
    docs_payload = docs_import.json()
    assert docs_payload["rows_imported"] == 1

    bootstrap = client.get("/workspace/bootstrap", headers=headers)
    payload = bootstrap.json()
    assert payload["analytics"]["total_deals"] == 1
    assert len(payload["contacts"]) == 1
    assert len(payload["investor_pipeline"]) == 1


def test_deal_workspace_endpoint_returns_operating_context():
    _reset_db()
    headers = _auth_headers()
    client.post("/demo/seed", headers=headers)

    bootstrap = client.get("/workspace/bootstrap", headers=headers).json()
    deal_id = bootstrap["deals"][0]["id"]

    workspace = client.get(f"/deals/{deal_id}/workspace", headers=headers)
    assert workspace.status_code == 200
    payload = workspace.json()

    assert payload["deal"]["id"] == deal_id
    assert len(payload["documents"]) >= 1
    assert len(payload["diligence_items"]) >= 1
    assert len(payload["stage_events"]) >= 1
    assert "operations_summary" in payload
    assert "decision_surface" in payload
    assert payload["decision_surface"]["current_verdict"]
    assert "confidence" in payload["decision_surface"]


def test_xlsx_import_supports_deals_contacts_template():
    _reset_db()
    headers = _auth_headers()

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(
        [
            "deal_name",
            "description",
            "asset_type",
            "city",
            "state",
            "source",
            "priority",
            "owner_name",
            "next_action",
            "contact_full_name",
            "contact_email",
            "contact_type",
            "company_name",
            "investor_type",
        ]
    )
    sheet.append(
        [
            "Granite Point Apartments",
            "Garden-style multifamily",
            "multifamily",
            "Atlanta",
            "GA",
            "Broker referral",
            "high",
            "analyst1",
            "Review rent roll",
            "Taylor Brooks",
            "taylor@example.com",
            "investor",
            "Southfield Capital",
            "family office",
        ]
    )
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    response = client.post(
        "/imports/csv?import_type=deals_contacts",
        headers=headers,
        files={
            "file": (
                "deals.xlsx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["rows_imported"] == 1

    bootstrap = client.get("/workspace/bootstrap", headers=headers).json()
    assert bootstrap["analytics"]["total_deals"] == 1


def test_cors_allows_clean_frontend_port_3001():
    response = client.options(
        "/auth/login",
        headers={
            "Origin": "http://127.0.0.1:3001",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3001"


def test_integration_catalog_returns_real_and_placeholder_items():
    _reset_db()
    headers = _auth_headers()

    response = client.get("/integrations/catalog", headers=headers)
    assert response.status_code == 200
    payload = response.json()

    assert "product_demo_mode" in payload
    assert "demo_notice" in payload
    assert len(payload["items"]) >= 10
    assert any(item["key"] == "azure_openai" for item in payload["items"])
    assert any(item["placeholder"] is True for item in payload["items"])


def test_integration_toggle_updates_enabled_state():
    _reset_db()
    headers = _auth_headers()

    toggle = client.post(
        "/integrations/catalog/toggle",
        headers=headers,
        json={"key": "slack", "enabled": True},
    )
    assert toggle.status_code == 200
    payload = toggle.json()
    assert payload["key"] == "slack"
    assert payload["enabled"] is True

    catalog = client.get("/integrations/catalog", headers=headers).json()
    slack = next(item for item in catalog["items"] if item["key"] == "slack")
    assert slack["enabled"] is True


def test_integration_catalog_exposes_config_fields_and_required_env_vars():
    _reset_db()
    headers = _auth_headers()

    payload = client.get("/integrations/catalog", headers=headers).json()
    graph = next(item for item in payload["items"] if item["key"] == "microsoft_graph")
    assert len(graph["config_fields"]) > 0
    assert len(graph["required_env_vars"]) > 0


def test_auth_providers_endpoint_exposes_microsoft_and_recovery_shape():
    payload = client.get("/auth/providers").json()
    assert "providers" in payload
    assert "local_recovery_enabled" in payload
    assert "local_signup_enabled" in payload
    assert "product_demo_mode" in payload
    assert payload["local_recovery_enabled"] is True
    microsoft = next(item for item in payload["providers"] if item["key"] == "microsoft")
    assert "available" in microsoft
    assert "description" in microsoft


def test_public_signup_is_disabled():
    response = client.post(
        "/auth/signup",
        json={"username": "intruder", "password": "passwordlongenough", "role": "admin"},
    )
    assert response.status_code == 403


def test_local_signup_when_allowed(monkeypatch):
    monkeypatch.setenv("REOS_ALLOW_LOCAL_SIGNUP", "true")
    _reset_db()
    response = client.post(
        "/auth/signup",
        json={
            "username": "newanalyst",
            "password": "longpasswordzz",
            "email": "newanalyst@example.com",
            "display_name": "New Analyst",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "analyst"
    login = client.post("/auth/login", json={"username": "newanalyst", "password": "longpasswordzz"})
    assert login.status_code == 200


def test_local_signup_rejects_duplicate_email(monkeypatch):
    monkeypatch.setenv("REOS_ALLOW_LOCAL_SIGNUP", "true")
    _reset_db()
    headers = _auth_headers()
    first = client.post(
        "/auth/signup",
        json={"username": "user_a", "password": "longpasswordaa", "email": "duplicate@example.com"},
    )
    assert first.status_code == 200
    second = client.post(
        "/auth/signup",
        json={"username": "user_b", "password": "longpasswordbb", "email": "duplicate@example.com"},
    )
    assert second.status_code == 409


def test_crm_email_import_preview_extracts_addresses():
    _reset_db()
    headers = _auth_headers()
    response = client.post(
        "/crm/email-import/preview",
        headers=headers,
        json={
            "raw_text": "From: Jane LP <jane@oaktree-capital.example>\nSubject: Re: subscription docs\nWe are committed and will wire this week.\n",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["detected"]) >= 1
    assert payload["detected"][0]["email"] == "jane@oaktree-capital.example"
    assert payload["detected"][0]["decision_hint"] == "committed"


def test_crm_company_create_and_patch():
    _reset_db()
    headers = _auth_headers()
    create = client.post(
        "/crm/companies",
        headers=headers,
        json={"name": "Summit Grove LP", "investor_type": "family office", "notes": "Met at IMN."},
    )
    assert create.status_code == 200
    cid = create.json()["id"]
    patch = client.patch(
        f"/crm/companies/{cid}",
        headers=headers,
        json={"notes": "Follow up on side letter."},
    )
    assert patch.status_code == 200
    assert "Follow up" in (patch.json().get("notes") or "")


def test_demo_seed_rejects_analyst_role():
    _reset_db()
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()
    login = client.post("/auth/login", json={"username": "analyst1", "password": "analyst123"})
    assert login.status_code == 200
    token = login.json()["token"]
    seed = client.post("/demo/seed", headers={"Authorization": f"Bearer {token}"})
    assert seed.status_code == 403


def test_dashboard_includes_operating_capabilities_and_decision_velocity():
    _reset_db()
    headers = _auth_headers()
    client.post("/demo/seed", headers=headers)
    r = client.get("/dashboard/data", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "operating_capabilities" in body
    assert "decision_velocity" in body
    assert len(body["operating_capabilities"]) >= 6
    assert body["decision_velocity"]["primary_value"].endswith("days")
    assert "median_days_to_diligence" in body["decision_velocity"]
    assert "median_days_in_investment_committee" in body["decision_velocity"]


def test_enterprise_overview_and_copilot_endpoints_return_operator_data():
    _reset_db()
    headers = _auth_headers()
    client.post("/demo/seed", headers=headers)

    portfolio = client.get("/portfolio/overview", headers=headers)
    assert portfolio.status_code == 200
    portfolio_payload = portfolio.json()
    assert "ai_briefing" in portfolio_payload
    assert len(portfolio_payload["committee_queue"]) >= 1

    operations = client.get("/operations/overview", headers=headers)
    assert operations.status_code == 200
    operations_payload = operations.json()
    assert len(operations_payload["tasks"]) >= 1

    governance = client.get("/governance/overview", headers=headers)
    assert governance.status_code == 200
    governance_payload = governance.json()
    assert "controls" in governance_payload

    copilot = client.post(
        "/ai/copilot",
        headers=headers,
        json={"workspace": "portfolio", "prompt": "Summarize the current operator priorities."},
    )
    assert copilot.status_code == 200
    copilot_payload = copilot.json()
    assert copilot_payload["workspace"] == "portfolio"
    assert copilot_payload["answer"]
