Author: Victor.I

# Interview Preparation Guide

## Whiteboard Narrative

Start from user value:

- one system for deal flow, documents, and diligence decisions
- AI assists analysts but does not replace accountability

Draw:

1. Frontend dashboard
2. API gateway/BFF
3. core domain services (Deals, CRM, Documents, AI)
4. async worker lane (OCR, embeddings, analysis)
5. PostgreSQL + object storage + vector index

Explain:

- modular boundaries
- asynchronous heavy processing
- evidence-based AI responses
- observability and fallback strategy

## Common Interview Questions

### Why build this internally?

To control workflow fit, auditability, and integration depth that generic CRMs cannot provide.

### Why RAG first?

RAG enables faster updates and stronger provenance for answers than early fine-tuning.

### How are hallucinations controlled?

Grounding constraints, citations, confidence gates, and analyst approval for high-risk outputs.

### How does it scale?

Stateless APIs and workers scale horizontally; queue partitioning isolates heavy AI work.

### What if AI service fails?

Fallback mode provides evidence search and partial summaries while preserving workflow continuity.

## Strategic Traps and Responses

- "Is this overengineered?" -> start modular monolith, decompose only at proven scale points.
- "Do we need AI?" -> AI targets document-heavy bottlenecks with measurable cycle-time impact.
- "How do you secure data?" -> RBAC, tenant isolation, encryption, signed URLs, immutable audits.
- "How do you control costs?" -> usage budgets, tiered models, retrieval filtering, async batching.

