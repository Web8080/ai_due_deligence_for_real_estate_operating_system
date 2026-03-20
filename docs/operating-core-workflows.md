# Core operating workflows in REOS

**Author:** Victor.I

This tracks the six operator problems you listed, where they live in the product today, and how the **Overview** KPI relates to **discovery to investment decision**.

| Problem | Status | Primary UI | API / behaviour |
|--------|--------|------------|-----------------|
| Finding deals | In-app | `/app/leads` | `GET /leads/overview`, `GET /leads/ai-fit-preview` |
| Organising contacts | In-app | `/app/crm` | Companies, contacts, notes, investor type, email paste import |
| Tracking deal stages | In-app | `/app/deals`, `/app/deals/[id]` | `PATCH /deals/{id}/stage`, timeline on workspace |
| Reviewing hundreds of documents | In-app | `/app/documents`, deal workspace | Library, upload, `POST /ai/query/{deal_id}` |
| Chasing investors | In-app | `/app/investors`, CRM email import | Pipeline rows, `POST /crm/email-import/*`, signals |
| Building reports manually | Partial | `/app/reports`, Overview briefing | Queue + brief text; deck export not automated |

## Discovery to decision (OS KPI)

**Location:** Overview (`/app`) section **Discovery to decision (OS KPI)**.

**What it shows:**

- **Median days in pipeline (open deals)** – calendar age from `deal.created_at` for deals in active stages (Lead through Closing).
- **Supporting metrics** – document coverage, investor rows with last-signal text.
- **Methodology** – printed on the dashboard; true “first touch to IC vote date” still needs explicit CRM/deal fields when you add them.

**Intent:** When intake, documents, stages, and investor replies live in one system, leadership can see **time pressure** and **coverage** in one place. The number is a **proxy**, not a substitute for committee judgment.

## Regenerating after schema changes

Restart the API so dashboards hit current models (`investor_email_signals`, etc.).
