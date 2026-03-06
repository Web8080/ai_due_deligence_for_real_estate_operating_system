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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

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

