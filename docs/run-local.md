Author: Victor.I

# Run Local

## Prerequisites

- Python 3.11+
- Node.js 20+
- Tesseract OCR installed
- Ollama installed and running

## Ollama Models

Pull models:

- `ollama pull nomic-embed-text`
- `ollama pull llama3.1:8b`

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

After `cp`, edit `.env` if you want a fixed `REOS_SESSION_SECRET` (otherwise a random secret is used each restart).

If the UI shows **Local recovery login is disabled**, `REOS_LOCAL_LOGIN_ENABLED` is not set to `true` for the API process. Fix: ensure `backend/.env` exists (see above) or export `REOS_LOCAL_LOGIN_ENABLED=true` before starting uvicorn.

### Troubleshooting

**`ERROR: Invalid requirement: '#'`**  
`pip` is seeing a stray `#` (usually from copy-pasting a comment on the same line as `pip install`). Run dependencies on its own line, nothing after it:

```bash
pip install -r requirements.txt
```

**`ERROR: [Errno 48] Address already in use` (port 8000)**  
Another uvicorn (or process) is bound to 8000. Free it, then start again:

```bash
lsof -ti :8000 | xargs kill -9
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

The UI calls the API through a **same-origin proxy** at `/api/reos/*` implemented by `frontend/app/api/reos/[[...path]]/route.js`. The Next.js server forwards to `http://127.0.0.1:8000` by default, which avoids **CORS** and many **Failed to fetch** cases. If the API is down, the proxy returns **502** with a JSON hint instead of a bare network error.

Override the proxy target if the API is not on loopback:

```bash
# frontend/.env.local
REOS_API_PROXY_TARGET=http://127.0.0.1:8000
```

To bypass the proxy and call the API host directly from the browser (you must allow that origin in the API CORS list):

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

```bash
cd frontend
npm install
npm run dev
```

Restart `npm run dev` after changing `next.config.mjs` or `.env.local`.

**`EADDRINUSE` on port 30001**  
The dev server defaults to `30001`. A previous `next dev` (or another app) may still own the port:

```bash
lsof -ti :30001 | xargs kill -9
cd frontend && npm run dev
```

**`Couldn't find any pages or app directory`**  
You started Next from the **repo root**. The UI lives under **`frontend/`**:

```bash
cd frontend
npm run dev
# alternate port (still from frontend/):
npx next dev -p 30002 -H 0.0.0.0
```

Running `npx next dev` at the monorepo root uses the wrong project root and will not see `frontend/app`.

## Smoke Tests

Backend unit smoke:

```bash
python -m pytest backend/tests/test_smoke.py -q
```

API smoke:

```bash
python scripts/smoke_test.py
```

## Non-Stop Orchestrator

Run autonomous cycles for 3 hours:

```bash
python orchestrator/nonstop_orchestrator.py --hours 3 --sleep-seconds 20
```

Default behavior each cycle:

- checks `tesseract` availability
- checks Ollama daemon reachability on `http://localhost:11434`
- checks required models: `nomic-embed-text`, `llama3.1:8b`
- runs backend smoke, frontend build, and API smoke (including AI smoke)
- strict prerequisite mode is enabled by default; cycles fail if Ollama/Tesseract/models are missing

Optional relaxed mode (continue even if AI prerequisites are missing):

```bash
python orchestrator/nonstop_orchestrator.py --hours 3 --sleep-seconds 20 --run-ai-smoke 0 --strict-prereq-check 0
```

## Fallback Policy

- Primary AI: Ollama embeddings + generation
- AI fallback: local hash-based embeddings + extractive grounded answer
- Primary OCR: Tesseract via `pytesseract`
- OCR fallback: basic mode (text/PDF extraction without image OCR)

No web signup is required for these fallback modes.

## CRM: companies, contacts, email paste import

- **Companies:** `GET/POST /crm/companies`, `PATCH /crm/companies/{id}` for notes and investor type.
- **Contacts:** `POST /crm/contacts`, `PATCH /crm/contacts/{id}`, `GET /crm/contacts`.
- **Email:** `POST /crm/email-import/preview` (authenticated) parses pasted threads; `POST /crm/email-import/commit` stores `investor_email_signals` and optionally updates `investor_pipeline_entries` when a deal is selected. Microsoft Graph / Gmail remain integration work.

## Product demo posture (no vendor wiring)

For stakeholder walkthroughs where integrations should read as specifications only:

- Set `REOS_PRODUCT_DEMO_MODE=true` on the API. The integration catalog and login screen carry an explicit demo notice; nothing in that mode implies live vendor sessions.
- Optional sandbox accounts: `REOS_ALLOW_LOCAL_SIGNUP=true` (only with `REOS_LOCAL_LOGIN_ENABLED=true`). New users are always role `analyst`.
- `POST /demo/seed` is limited to `admin` and `manager` so analysts do not overwrite shared demo databases by accident.

## Azure Integration Prep

For company Azure rollout, keep these values in `.env` (do not commit):

```bash
REOS_AI_PROVIDER=azure_openai
REOS_AZURE_OPENAI_ENDPOINT=
REOS_AZURE_OPENAI_API_KEY=
REOS_AZURE_OPENAI_CHAT_DEPLOYMENT=
REOS_AZURE_OPENAI_EMBED_DEPLOYMENT=
REOS_AZURE_STORAGE_ACCOUNT=
REOS_AZURE_STORAGE_CONTAINER=
REOS_AZURE_TENANT_ID=
REOS_AZURE_CLIENT_ID=
REOS_AZURE_AUDIENCE=
REOS_AZURE_KEY_VAULT_URL=
REOS_AUTOMATION_MODE=assistive
```

You can verify readiness from the dashboard or API endpoint: `GET /integrations/status`.

