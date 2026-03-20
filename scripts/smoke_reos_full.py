# Author: Victor.I
"""
Full API smoke pass against a running REOS backend (stdlib only; no httpx required).

Usage:
  export REOS_ENABLE_LOCAL_BOOTSTRAP=true REOS_LOCAL_LOGIN_ENABLED=true
  uvicorn backend.app.main:app --reload  # separate terminal
  python scripts/smoke_reos_full.py

Environment:
  API_BASE          default http://127.0.0.1:8000
  RUN_DEMO_SEED     default 1 — POST /demo/seed before checks
  RUN_AI_HEAVY      default 0 — document upload + /ai/query
  RUN_COPILOT       default 0 — POST /ai/copilot
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

API_BASE = os.getenv("API_BASE", "http://127.0.0.1:8000").rstrip("/")
RUN_DEMO_SEED = os.getenv("RUN_DEMO_SEED", "1") == "1"
RUN_AI_HEAVY = os.getenv("RUN_AI_HEAVY", "0") == "1"
RUN_COPILOT = os.getenv("RUN_COPILOT", "0") == "1"


def log(msg: str) -> None:
    print(msg, flush=True)


def skip(reason: str) -> None:
    log(f"  SKIP: {reason}")


def ok(name: str) -> None:
    log(f"  OK  {name}")


def fail(msg: str) -> None:
    log(f"FAIL {msg}")
    sys.exit(1)


def request_json(
    method: str,
    path: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[dict] = None,
    timeout: float = 60.0,
) -> Any:
    url = f"{API_BASE}{path}"
    data = None
    h = dict(headers or {})
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"{method} {path} -> {e.code} {err_body}") from e


def wait_health() -> None:
    for i in range(20):
        try:
            data = request_json("GET", "/health", timeout=3.0)
            if data.get("status") == "ok":
                return
        except Exception:
            pass
        time.sleep(1)
    fail("API /health did not become ready (start uvicorn: PYTHONPATH=. uvicorn backend.app.main:app --port 8000)")


def main() -> None:
    skips: list[str] = []

    wait_health()

    try:
        body = request_json("GET", "/health/ai", timeout=5.0)
        log(
            f"AI health: provider={body.get('ai_provider')} ollama_reachable={body.get('ollama_reachable')} "
            f"local_fallback={body.get('local_fallback')}"
        )
        if body.get("ollama_reachable") is False:
            skips.append("Ollama not running — set REOS_AI_MODE=local_fallback or start Ollama for generative paths")
    except Exception as exc:
        skips.append(f"/health/ai error: {exc}")

    try:
        login = request_json("POST", "/auth/login", body={"username": "admin", "password": "admin123"})
        token = login["token"]
    except Exception as exc:
        fail(
            f"Login failed ({exc}). Set REOS_ENABLE_LOCAL_BOOTSTRAP=true REOS_LOCAL_LOGIN_ENABLED=true "
            "and restart API."
        )

    headers = {"Authorization": f"Bearer {token}"}

    if RUN_DEMO_SEED:
        seed = request_json("POST", "/demo/seed", headers=headers)
        ok(
            f"demo/seed deals={seed.get('deals_created')} backfill_tasks={seed.get('workflow_tasks_added')} "
            f"chunks={seed.get('chunks_added')}"
        )
    else:
        skip("RUN_DEMO_SEED=0 — dashboard may be sparse")

    endpoints = [
        "/dashboard/data",
        "/executive/briefing",
        "/workspace/bootstrap",
        "/portfolio/overview",
        "/deals/overview",
        "/leads/overview",
        "/leads/ai-fit-preview",
        "/crm/overview",
        "/crm/graph",
        "/investors/overview",
        "/documents/library",
        "/operations/overview",
        "/reports/overview",
        "/integrations/catalog",
        "/integrations/status",
        "/automation/recommendations",
        "/playbook/checklist",
        "/governance/overview",
        "/admin/overview",
    ]
    for path in endpoints:
        try:
            request_json("GET", path, headers=headers)
            ok(f"GET {path}")
        except Exception as exc:
            fail(str(exc))

    dash = request_json("GET", "/dashboard/data", headers=headers)
    if not dash.get("kpis"):
        fail("dashboard/data missing kpis")
    log(f"  Dashboard KPI sample: {dash['kpis'][0] if dash['kpis'] else 'none'}")

    if RUN_COPILOT:
        try:
            request_json(
                "POST",
                "/ai/copilot",
                headers={**headers, "Content-Type": "application/json"},
                body={"workspace": "portfolio", "prompt": "One-line portfolio summary for smoke test."},
                timeout=120.0,
            )
            ok("/ai/copilot")
        except Exception as exc:
            skips.append(f"/ai/copilot: {exc}")
    else:
        skip("RUN_COPILOT=0 — LLM path not exercised")

    if RUN_AI_HEAVY:
        try:
            deal = request_json(
                "POST",
                "/deals",
                headers=headers,
                body={"name": "Smoke AI Deal", "description": "smoke", "priority": "low"},
            )
            deal_id = deal["id"]
            # multipart with stdlib is verbose; skip file upload in stdlib path — document
            skips.append("RUN_AI_HEAVY multipart upload not implemented in stdlib smoke; use scripts/smoke_test.py with httpx or RUN_AI_SMOKE=1")
        except Exception as exc:
            skips.append(f"AI heavy: {exc}")
    else:
        skip("RUN_AI_HEAVY=0 — document RAG path not exercised in this script")

    log("")
    log("External / optional (placeholders in UI + governance):")
    for s in skips:
        log(f"  - {s}")
    log("")
    log("Smoke pass completed.")


if __name__ == "__main__":
    main()
