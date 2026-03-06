# Author: Victor.I
from io import BytesIO

from fastapi.testclient import TestClient

from backend.app.auth import create_default_admin
from backend.app.database import SessionLocal
from backend.app.main import app

client = TestClient(app)


def _auth_headers():
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()
    login = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_smoke_end_to_end(monkeypatch):
    async def fake_embed(_text: str):
        return [0.1, 0.2, 0.3]

    async def fake_generate(_question: str, _chunks):
        return "Grounded answer with citations."

    monkeypatch.setattr("backend.app.main.embed_text", fake_embed)
    monkeypatch.setattr("backend.app.main.generate_grounded_answer", fake_generate)

    headers = _auth_headers()

    deal = client.post("/deals", headers=headers, json={"name": "Downtown Office", "description": "Screening"}).json()
    assert deal["name"] == "Downtown Office"

    stage = client.patch(f"/deals/{deal['id']}/stage", headers=headers, json={"stage": "Due Diligence"}).json()
    assert stage["stage"] == "Due Diligence"

    contact = client.post(
        "/crm/contacts",
        headers=headers,
        json={"full_name": "Nora Lane", "email": "nora@example.com", "contact_type": "broker", "deal_id": deal["id"]},
    ).json()
    assert contact["contact_type"] == "broker"

    file_data = BytesIO(b"Lease terms include annual escalation at 3 percent.")
    upload = client.post(
        f"/documents/{deal['id']}/upload",
        headers=headers,
        files={"file": ("lease.txt", file_data, "text/plain")},
    ).json()
    assert upload["filename"] == "lease.txt"

    answer = client.post(
        f"/ai/query/{deal['id']}",
        headers=headers,
        json={"question": "What is the annual escalation?"},
    ).json()
    assert "Grounded answer" in answer["answer"]
    assert len(answer["citations"]) > 0
