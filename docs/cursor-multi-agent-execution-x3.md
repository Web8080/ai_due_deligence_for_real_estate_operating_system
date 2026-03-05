Author: Victor.I

# Cursor Multi-Agent Execution (x3)

This setup runs three parallel agent tracks to build REOS faster while keeping ownership boundaries clear.

## Agent Topology

- Agent 1: Backend + Data
- Agent 2: AI/RAG + Evaluation
- Agent 3: Frontend + DevOps Integration

## Shared Definition of Done

- server-side authorization enforced
- every API contract versioned and validated
- AI outputs include evidence citations
- logs/traces available for all critical flows
- fallback behavior tested for key dependencies

## Prompt: Agent 1 (Backend + Data)

Build the backend foundations for REOS using FastAPI, PostgreSQL, Redis, and Celery.
Implement:
1) auth + RBAC,
2) deal workflow APIs,
3) CRM entities,
4) document metadata + audit logs,
5) async job orchestration primitives.
Output:
- endpoint list,
- schema migration plan,
- job queue design,
- test plan.
Constraints:
- strict input validation,
- idempotent writes,
- no secrets in code,
- health checks and structured logging required.

## Prompt: Agent 2 (AI/RAG + Evaluation)

Build the AI due diligence layer for REOS.
Implement:
1) ingestion to chunking pipeline,
2) embeddings + vector index lifecycle,
3) hybrid retrieval + reranking,
4) grounded answer generation with citations,
5) evaluation suite for quality, latency, and cost.
Output:
- pipeline modules and interfaces,
- anti-hallucination safeguards,
- fallback design for model/index outages,
- benchmark checklist.
Constraints:
- evidence-first responses only,
- model/vendor abstraction,
- auditable run metadata on every response.

## Prompt: Agent 3 (Frontend + DevOps Integration)

Build the Next.js operator UI and deployment guardrails for REOS.
Implement:
1) stage-based deal workspace UX,
2) document and AI insight views,
3) API integration via BFF pattern,
4) Docker-based local stack and CI checks.
Output:
- route map and component ownership,
- API integration contracts,
- CI/CD pipeline checks,
- production runbook draft.
Constraints:
- role-based route protection,
- resilient loading/error states,
- observability and rollback readiness.

## Orchestration Rules

- each agent commits only inside its boundary
- integration happens through explicit interface contracts
- daily merge checkpoint: API contract sync + migration compatibility check
- block merges when security checks or contract tests fail

## Merge Sequence

1. Merge Agent 1 baseline APIs and schema.
2. Merge Agent 2 against stable document and deal contracts.
3. Merge Agent 3 once BFF contracts are frozen for the sprint.
4. Run end-to-end scenario: create deal -> upload docs -> run AI diligence -> approve/reject.

