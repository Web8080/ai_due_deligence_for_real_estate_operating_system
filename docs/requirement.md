Author: Victor.I

# REOS Requirements

## 1. Problem Statement

Real estate teams process large volumes of contracts, reports, and financial artifacts using fragmented tools and manual workflows. REOS centralizes deal execution and adds AI-assisted due diligence with traceable, auditable outputs.

## 2. Users and Outcomes

- Acquisitions Analyst: faster screening and diligence package review.
- Investment Committee Member: reliable summaries with evidence citations.
- Legal/Compliance: complete audit trail for document and decision history.
- Operations/Engineering: observable, secure platform with controlled cost.

Success outcomes:

- reduced deal review cycle time
- higher diligence consistency
- fewer undocumented decisions
- measurable AI quality and cost controls

## 3. Functional Requirements

### 3.1 Deal Lifecycle

- create and manage deals across stages: Lead, Screening, Due Diligence, Investment Committee, Approved/Rejected
- enforce stage gates with required fields and required artifacts
- maintain immutable transition history with actor and reason

### 3.2 CRM

- manage investors, brokers, and counterparties
- record interactions, commitments, and contact roles
- link CRM entities to deals and documents

### 3.3 Document Management

- secure upload and versioning for deal documents
- OCR/text extraction and metadata classification
- document lineage from raw file to AI artifacts

### 3.4 AI Due Diligence

- RAG-based Q&A grounded only in retrieved documents
- due diligence summary generation with citations
- analyst review and approval workflow for high-risk outputs

### 3.5 Reporting and Auditability

- deal-level activity feed and decision timeline
- exportable diligence report with evidence references
- immutable audit logs for security and governance actions

## 4. Non-Functional Requirements

- Availability target: 99.9% for API tier
- Performance target: critical API p95 < 300ms (excluding long async AI jobs)
- Security: tenant isolation, RBAC, encryption in transit and at rest
- Reliability: idempotent jobs, retries with backoff, dead-letter queue
- Observability: tracing, structured logs, SLO dashboards, actionable alerts
- Maintainability: versioned contracts, modular services, clear ownership boundaries

## 5. Security Requirements

- short-lived access tokens + refresh token rotation
- server-side authorization on every protected endpoint
- input validation and output sanitization across services
- signed upload URLs with MIME and malware checks
- no secrets in repository; secret manager only
- rate limiting and abuse controls on auth and public endpoints

## 6. Data and AI Requirements

- schema validation on ingestion for malformed or incomplete files
- chunk-level provenance: `doc_id`, `page/section`, `chunk_id`, model version
- evidence-first responses; unsupported claims must be blocked or flagged
- vendor-agnostic AI adapters for embeddings, reranking, and generation
- quality evaluation suite for groundedness, recall, latency, and cost

## 7. Constraints

- prototype stack: FastAPI, PostgreSQL, Redis, Celery, Next.js
- containerized local development and production-aligned deployment
- phased delivery; avoid premature microservice decomposition where not needed

## 8. Acceptance Criteria (MVP)

- can create a deal and move it through all defined stages
- can ingest and process documents end-to-end
- can ask diligence questions and receive cited answers
- can generate a diligence summary with confidence and evidence links
- can observe system health via `/health` and core metrics dashboards
- can recover from worker or model failure through defined fallback behavior

