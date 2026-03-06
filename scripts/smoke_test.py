# Author: Victor.I
import os
import time

import httpx


API_BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")
RUN_AI = os.getenv("RUN_AI_SMOKE", "0") == "1"


def request_json(method: str, path: str, payload=None, headers=None):
    url = f"{API_BASE}{path}"
    with httpx.Client(timeout=30.0) as client:
        response = client.request(method, url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


def wait_for_health():
    for _ in range(30):
        try:
            data = request_json("GET", "/health")
            if data.get("status") == "ok":
                return True
        except Exception:
            time.sleep(1)
    return False


def main():
    if not wait_for_health():
        raise RuntimeError("API health check failed")

    login = request_json("POST", "/auth/login", {"username": "admin", "password": "admin123"})
    token = login["token"]
    headers = {"Authorization": f"Bearer {token}"}

    deal = request_json("POST", "/deals", {"name": "Smoke Deal", "description": "test run"}, headers=headers)
    deal_id = deal["id"]

    stage = request_json("PATCH", f"/deals/{deal_id}/stage", {"stage": "Due Diligence"}, headers=headers)
    assert stage["stage"] == "Due Diligence"

    contact = request_json(
        "POST",
        "/crm/contacts",
        {"full_name": "Smoke Broker", "email": "broker@test.com", "contact_type": "broker", "deal_id": deal_id},
        headers=headers,
    )
    assert contact["full_name"] == "Smoke Broker"

    if RUN_AI:
        with httpx.Client(timeout=90.0) as client:
            files = {"file": ("smoke-lease.txt", b"Annual rent escalation is 3 percent.", "text/plain")}
            upload_response = client.post(
                f"{API_BASE}/documents/{deal_id}/upload",
                files=files,
                headers={"Authorization": f"Bearer {token}"},
            )
            upload_response.raise_for_status()

            ai_response = client.post(
                f"{API_BASE}/ai/query/{deal_id}",
                json={"question": "What is the annual escalation?"},
                headers={"Authorization": f"Bearer {token}"},
            )
            ai_response.raise_for_status()
            ai_payload = ai_response.json()
            if "answer" not in ai_payload:
                raise RuntimeError("AI query response missing answer field")
            if len(ai_payload.get("citations", [])) == 0:
                raise RuntimeError("AI query response missing citations")

    print("Smoke test passed.")


if __name__ == "__main__":
    try:
        main()
    except httpx.HTTPError as exc:
        print(f"HTTP error: {exc}")
        raise
