Author: Victor.I

# System Architecture

## High-Level Topology

- Frontend: Next.js application for deal operations, CRM, and AI workflows
- API/BFF: FastAPI gateway for auth, aggregation, and policy enforcement
- Core services: deal workflow, CRM, documents, AI analysis, notifications
- Data plane: PostgreSQL (system of record), Redis (cache/queue), object storage
- Async processing: Celery workers for OCR, extraction, embeddings, analysis jobs

## Service Boundaries

- Identity and Access: users, sessions, RBAC, tenant membership
- Deal Workflow: stages, checklists, tasks, approvals, activity timeline
- CRM: investors, brokers, interactions, contact linkage
- Document Intelligence: upload, parsing, extraction, metadata, versioning
- AI Due Diligence: retrieval orchestration, analysis runs, findings, evidence map
- Integrations: external connectors, webhook ingestion, reconciliation jobs

## Data Ownership

- PostgreSQL owns transactional truth (deals, permissions, states, audit logs)
- Object storage owns raw and versioned document binaries
- Vector index owns semantic retrieval state, keyed by canonical document/chunk IDs
- Redis owns ephemeral cache and queue state only

## Key Read/Write Paths

1. User creates or updates a deal via API -> PostgreSQL.
2. User uploads document -> object storage -> async parser workflow.
3. Parser emits normalized text/chunks -> embeddings -> vector index.
4. Analyst query triggers retrieval + reranking -> grounded LLM response with citations.
5. Decision artifacts and approvals persist in PostgreSQL with immutable audit events.

## Operational Characteristics

- Horizontal scaling: stateless API and workers scale independently
- Backpressure controls: queue partitioning by job criticality
- Failure isolation: async job failures do not block core deal management flows
- Recovery: retry policy, dead-letter queue, replay tooling

## Observability Baseline

- Structured logs with correlation IDs
- Request traces across API, DB, and async workers
- SLIs: error rate, latency, queue lag, ingestion completion time
- SLO alerts tied to on-call runbooks

