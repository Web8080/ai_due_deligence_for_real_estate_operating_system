# AI strategy, guardrails, and execution order

Author: Victor.I

## Positioning (not generic “AI for real estate”)

REOS targets a **decision and operations layer** for real estate capital and deal workflows: fewer reconciliations, explicit exceptions, human checkpoints on money and legal steps. The product is not “a chatbot on spreadsheets”; it is scaffolding for **grounded answers**, **workflow state**, and **auditability**.

Predictive ML (forecasting, propensity, price models) is a **later phase** once labels exist from closed outcomes. Until then, the stack defaults to **Ollama** (local LLM) or **`REOS_AI_MODE=local_fallback`** for deterministic demos without a running model server.

## What ships in this repository today

| Layer | Status |
|-------|--------|
| Deal / CRM / investor / document / workflow data model | Implemented |
| RAG over uploaded deal documents (chunks + retrieve + answer) | Implemented; needs embed model (Ollama) or falls back per env |
| Workspace copilot (`/ai/copilot`) | Implemented; calls configured LLM route |
| Lead heuristic ranking (`/leads/ai-fit-preview`) | Implemented (rule-based demo; swap for ML later) |
| Governance copy: guardrails, hallucination controls, external placeholders | Exposed on **Governance** overview API + UI |
| Microsoft Entra, Apollo, Snov.io, FRED, CompStak, institutional market data vendors | **Catalog + env hooks**; live traffic only when keys, contracts, and workers exist |

## Guardrails (summary)

- **Human gates**: stage changes and capital actions remain user-driven; AI output is advisory unless you explicitly build automation with policy.
- **Grounding**: deal Q&A should cite chunks; empty retrieval should yield cautious answers (verify in prompts and tests).
- **Logging**: copilot and AI paths log to `AIRun`; tune retention for your compliance regime.
- **Injection**: treat all user text as untrusted; do not let model output execute as code; validate tool inputs if you add agents.

## Hallucination and quality

- Maintain a **small gold set** of questions with expected citations (see `backend/tests`).
- Track **override rate** in operations: if analysts consistently ignore AI text, fix retrieval or prompts—not only the model.
- Prefer **structured financial outputs** from calculators; let the LLM explain assumptions, not invent numbers.

## Smoke testing

1. Start API with local bootstrap enabled (see `docs/DATA_SEED.md` for env vars).
2. Run `python scripts/smoke_reos_full.py` (install `httpx` in the same env as the script).

Optional:

- `RUN_COPILOT=1` exercises `/ai/copilot` (needs Ollama or appropriate provider).
- `RUN_AI_HEAVY=1` exercises upload + `/ai/query` (needs embedding path).
- `REOS_AI_MODE=local_fallback` avoids calling Ollama for some paths when testing without a GPU machine.

## Ollama

- URL override: `REOS_OLLAMA_URL` (default `http://localhost:11434`).
- Probe: `GET /health/ai` (unauthenticated) reports `ollama_reachable` when `REOS_AI_PROVIDER=ollama`.

## External services explicitly not required for dashboard demos

Seeded data plus `POST /demo/seed` populate the dashboard and most overview endpoints. Anything requiring vendor keys is listed under **Governance → external placeholders** in the app.
