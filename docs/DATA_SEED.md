# Demo data seed

Author: Victor.I

## Run

From the repository root, with backend dependencies installed and `PYTHONPATH` including the repo (or run from a venv that has the package):

```bash
python scripts/seed_local_demo.py
```

Or authenticate to the API and call:

`POST /demo/seed`

## What gets created

**Initial insert (empty deals table only)**

- 15 deals across stages (including Closing, Rejected, IC, etc.)
- 3 diligence items per deal (one marked `done` for variety)
- Stage history events; extra `Lead` → current stage for early deals
- One offering memo document per deal
- Companies, 24 named contacts (rotating identities), investor pipeline rows for investor-backed contacts
- Notes on the first four companies

**Idempotent backfill (every seed / POST)**

- Workflow tasks until ~18 (one per deal without a task, active stages)
- Workflow exceptions until ~10 (high-priority or late-stage deals)
- Up to two deal notes per deal (first 14 deals)
- Extra documents (`lease_abstract`, `environmental_screening`) per deal up to 3 files total
- Sample `AIQueryLog` rows for grounded Q&A history
- Sample `AIRun` rows for workspace copilot history
- Audit events (including `demo_dataset_enriched` once)
- RAG `Chunk` rows (local hash embedding) for the first document on the first five deals

Re-running seed does not wipe the database; backfill only adds missing rows.

## Users

Local bootstrap users are defined in `backend/app/auth.py` (`DEFAULT_USERS`).

## Non-goals

- No external API calls (Apollo, Graph, etc.)
- Chunk embeddings are deterministic local vectors unless you run full RAG ingest with Ollama/Azure
