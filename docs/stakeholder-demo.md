# Stakeholder demo walkthrough

Author: Victor.I

## Purpose

The **Overview** at `/app` is a compact operator dashboard (KPIs, briefing, widgets). **Strategy and automation narrative** (deck-aligned copy, 50 themes, pipelines, moat) lives under **Operations > Automation playbook** (`/app/strategy`). Lead sourcing demos stay on **Intake** (`/app/leads`).

## What is live vs illustrative

| Area | Source |
|------|--------|
| **Overview (`/app`)** | KPIs, pipeline bars, briefing, and widgets from workspace data; no long strategy narrative |
| **Automation playbook (`/app/strategy`)** | Executive deck narrative, checklists, integration blueprint |
| KPI deal counts, pipeline stage counts, investor pipeline counts | Workspace database after seed |
| Executive briefing lines | Derived from deals, diligence, exceptions, investor entries |
| Chart, sample tasks, highlighted deals, activity lines | Seeded / static placeholders in API |
| Apollo prospect samples | Static rows on **Intake**; enrichment requires `REOS_APOLLO_API_KEY` and a sync worker |
| AI fit preview (`GET /leads/ai-fit-preview`) | Deterministic heuristic over Lead/Screening deals; replace with LLM when approved |

The **Ollama side chat is hidden on Overview** (`/app`) to keep the dashboard clean; it remains on other app routes.

## Seeding

1. Ensure local auth bootstrap is enabled per your environment.
2. Run `python scripts/seed_local_demo.py` (from repo root, with backend dependencies installed).
3. Log in with a seeded user (see `DEFAULT_USERS` in `backend/app/auth.py`).

## External integrations

Placeholder integrations are listed in the integration catalog (`GET /integrations/catalog`) and summarized on the dashboard. **Apollo.io** appears as `apollo_io` with env var `REOS_APOLLO_API_KEY`.

## Non-goals

- No outbound calls to Apollo, CompStak, DocuSign, etc. in this demo path.
- No warranty that heuristic scores match investment merit; human committee gates remain mandatory.

## Failure modes

- Empty dashboard decision queue: run demo seed or add diligence/exception records.
- AI fit preview returns an empty ranked list: no deals in Lead or Screening stages.
