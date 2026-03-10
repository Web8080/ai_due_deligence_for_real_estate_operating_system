# Author: Victor.I
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

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
