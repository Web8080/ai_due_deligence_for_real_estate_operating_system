# Integrations Control Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated integrations page for the REOS dashboard with real-backed readiness for current integrations and polished placeholder cards for future integrations whose APIs are not yet ready.

**Architecture:** Add a normalized integration catalog contract in the FastAPI backend, expose toggle/config endpoints, and render a new `/app/integrations` dashboard route that consumes the catalog. Reuse existing readiness logic where possible, and model future integrations with the same schema so the UI stays stable when real APIs are added later.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Next.js App Router, React, existing local MVP dashboard shell, pytest

---

### Task 1: Add failing backend test for integration catalog

**Files:**
- Modify: `backend/tests/test_local_mvp.py`
- Test: `backend/tests/test_local_mvp.py`

**Step 1: Write the failing test**

```python
def test_integration_catalog_returns_real_and_placeholder_items():
    headers = _auth_headers()
    response = client.get("/integrations/catalog", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert any(item["key"] == "azure_openai" for item in payload["items"])
    assert any(item["placeholder"] is True for item in payload["items"])
```

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests/test_local_mvp.py::test_integration_catalog_returns_real_and_placeholder_items -q`

Expected: FAIL with `404 Not Found`

**Step 3: Write minimal implementation**

- Add Pydantic schemas for integration catalog item and catalog response in `backend/app/schemas.py`
- Add catalog builder helpers in `backend/app/main.py`
- Reuse existing readiness logic from `/integrations/status`

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests/test_local_mvp.py::test_integration_catalog_returns_real_and_placeholder_items -q`

Expected: PASS

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 2: Add failing backend test for integration toggle persistence

**Files:**
- Modify: `backend/tests/test_local_mvp.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`

**Step 1: Write the failing test**

```python
def test_integration_toggle_updates_enabled_state():
    headers = _auth_headers()
    response = client.post("/integrations/catalog/toggle", headers=headers, json={"key": "slack", "enabled": True})
    assert response.status_code == 200
    payload = client.get("/integrations/catalog", headers=headers).json()
    slack = next(item for item in payload["items"] if item["key"] == "slack")
    assert slack["enabled"] is True
```

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests/test_local_mvp.py::test_integration_toggle_updates_enabled_state -q`

Expected: FAIL with `404 Not Found`

**Step 3: Write minimal implementation**

- Add lightweight persistence model for integration preferences in `backend/app/models.py`
- Add toggle request/response schemas in `backend/app/schemas.py`
- Add toggle endpoint in `backend/app/main.py`

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests/test_local_mvp.py::test_integration_toggle_updates_enabled_state -q`

Expected: PASS

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 3: Add failing backend test for configuration summaries

**Files:**
- Modify: `backend/tests/test_local_mvp.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`

**Step 1: Write the failing test**

```python
def test_integration_catalog_exposes_config_fields_and_required_env_vars():
    headers = _auth_headers()
    payload = client.get("/integrations/catalog", headers=headers).json()
    graph = next(item for item in payload["items"] if item["key"] == "microsoft_graph")
    assert len(graph["config_fields"]) > 0
    assert len(graph["required_env_vars"]) > 0
```

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests/test_local_mvp.py::test_integration_catalog_exposes_config_fields_and_required_env_vars -q`

Expected: FAIL because fields are missing

**Step 3: Write minimal implementation**

- Extend the integration catalog schema with config metadata
- Populate realistic field definitions for both live and placeholder integrations

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests/test_local_mvp.py::test_integration_catalog_exposes_config_fields_and_required_env_vars -q`

Expected: PASS

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 4: Add frontend integrations route and navigation entry

**Files:**
- Modify: `frontend/app/components/app-shell.js`
- Create: `frontend/app/app/integrations/page.js`
- Create: `frontend/app/components/integrations-page.js`
- Modify: `frontend/app/globals.css`

**Step 1: Write the failing UI expectation**

Use a smoke-oriented expectation:

```text
Open /app/integrations and expect:
- page title "Integrations"
- navigation link visible from app shell
- integration overview cards
```

**Step 2: Run build to verify current gap**

Run: `npm run build`

Expected: current route missing or page not implemented

**Step 3: Write minimal implementation**

- Add `Integrations` nav link
- Create the route and render:
  - overview cards
  - integration list
  - placeholder badges

**Step 4: Run build to verify it passes**

Run: `npm run build`

Expected: PASS

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 5: Wire frontend to backend integration catalog

**Files:**
- Modify: `frontend/app/app/integrations/page.js`
- Modify: `frontend/app/lib/reos-client.js`

**Step 1: Write the failing behavior expectation**

```text
The integrations page should render catalog items returned by /integrations/catalog.
```

**Step 2: Run manual smoke check to verify current gap**

Run the app locally and load `/app/integrations`

Expected: static UI or missing data binding

**Step 3: Write minimal implementation**

- Fetch `/integrations/catalog`
- Render sections for live-backed and placeholder-backed integrations
- Show:
  - status
  - enabled state
  - summary
  - config fields
  - required env vars

**Step 4: Verify UI behavior**

Run:
- `npm run build`
- local smoke test in browser

Expected: page renders real data

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 6: Add toggle behavior in the frontend

**Files:**
- Modify: `frontend/app/app/integrations/page.js`
- Modify: `frontend/app/globals.css`

**Step 1: Write the failing behavior expectation**

```text
Toggling an integration should update the backend and reflect the new state in the UI.
```

**Step 2: Run manual verification to confirm current gap**

Open `/app/integrations`

Expected: toggle exists but is not connected, or no toggle yet

**Step 3: Write minimal implementation**

- Add toggle actions that call the backend endpoint
- Refresh or update local page state after mutation
- Keep placeholder integrations toggleable for UI testing

**Step 4: Verify behavior**

Run:
- backend tests
- local browser smoke test

Expected: toggles visibly change and persist through reload

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 7: Add detail panel for config and testing notes

**Files:**
- Modify: `frontend/app/app/integrations/page.js`
- Modify: `frontend/app/globals.css`

**Step 1: Write the failing behavior expectation**

```text
Selecting an integration should reveal a detail panel with config fields, required env vars, and implementation notes.
```

**Step 2: Run manual check to confirm current gap**

Open `/app/integrations`

Expected: no detail panel yet

**Step 3: Write minimal implementation**

- Add selected integration state
- Render detail panel with:
  - auth type
  - required env vars
  - config fields
  - placeholder/live mode
  - testing notes

**Step 4: Verify behavior**

Run:
- `npm run build`
- browser smoke check

Expected: detail panel renders with correct integration metadata

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.

### Task 8: Add final verification and smoke coverage

**Files:**
- Modify: `backend/tests/test_local_mvp.py`
- Optional Modify: `docs/smoke-test-isolated-stack.md`

**Step 1: Add final test coverage**

Add or extend tests for:

- catalog endpoint
- toggle endpoint
- placeholder metadata
- CORS-safe local dashboard behavior if needed

**Step 2: Run full verification**

Run:
- `PYTHONPATH=. backend/.venv/bin/python -m pytest backend/tests -q`
- `npm run build`

Expected:
- backend tests pass
- frontend build passes

**Step 3: Run local smoke test**

Verify:

- `/app/integrations` loads
- overview cards render
- placeholders are visible
- toggles work
- detail panel works

**Step 4: Record outcome**

Document any remaining gaps clearly if real API connectivity is still deferred.

**Step 5: Commit**

Do not commit unless the user explicitly asks for it.
