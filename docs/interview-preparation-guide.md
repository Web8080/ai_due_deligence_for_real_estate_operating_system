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

### Why use Azure Front Door and Application Gateway together?

Front Door handles global entry and routing while Application Gateway provides regional WAF and app-level routing controls before API Management.

### Why API Management in front of services?

It centralizes auth policy, throttling, partner integrations, and versioning so domain services stay focused on business logic.

### How would you design Azure OpenAI governance?

Versioned prompts, model allow-lists, response quality telemetry, and staged rollout with replay testing before promotion.

### How do you prevent automation from causing operational harm?

Use confidence thresholds, human approval gates for high-risk actions, and a safe fallback path when uncertainty is high.

### How do you handle asynchronous document processing reliability?

Queue-first design with idempotency keys, dead-letter queues, bounded retries, and replay tooling with audit traces.

### How do you integrate with existing enterprise systems safely?

Route integrations through API Management with explicit contracts, schema validation, and per-integration rate limits.

### How do you control AI spend at scale?

Precompute embeddings once, cache retrieval answers where policy allows, enforce token budgets, and monitor cost per workflow stage.

### How do you secure sensitive documents and outputs?

Use RBAC claims mapping from Entra ID, private storage access patterns, encrypted data at rest/in transit, and immutable access audit logs.

### How do you explain the local-to-enterprise migration path?

Keep local-first architecture for developer speed, then progressively enable Azure mode through integration readiness checks and staged cutover.

### What are the hardest integration risks?

Identity drift, data residency constraints, cross-system schema drift, and operational ownership gaps between platform and product teams.

## Strategic Traps and Responses

- "Is this overengineered?" -> start modular monolith, decompose only at proven scale points.
- "Do we need AI?" -> AI targets document-heavy bottlenecks with measurable cycle-time impact.
- "How do you secure data?" -> RBAC, tenant isolation, encryption, signed URLs, immutable audits.
- "How do you control costs?" -> usage budgets, tiered models, retrieval filtering, async batching.

## Deep-Dive Questions (AI, Automation, Azure)

### AI and RAG Depth

- How do you prove groundedness quality over time?
- What metrics indicate retrieval degradation vs generation degradation?
- How do you evaluate model upgrades before production cutover?
- How do you handle contradictory evidence in source documents?

### Automation and Operations

- Which workflows should remain human-only and why?
- How do you stop duplicate queue processing during retries?
- How do you create reliable SLA alerts without alert fatigue?
- What is your rollback strategy if a new worker release corrupts output?

### Azure Enterprise Integration

- How do you structure environment isolation across dev/staging/prod in Azure?
- When do you choose Functions vs containerized workers for pipeline stages?
- How do you secure machine-to-machine authentication across services?
- How do you onboard a new external enterprise integration through API Management?

### Security and Compliance

- How do you implement least privilege for data scientists, analysts, and admins?
- What should be logged for auditability without leaking sensitive content?
- How do you satisfy legal hold and document retention requirements?
- How do you test incident response paths for credential compromise?

