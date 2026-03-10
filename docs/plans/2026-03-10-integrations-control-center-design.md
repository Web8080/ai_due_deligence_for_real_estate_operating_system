# Author: Victor.I

# Integrations Control Center Design

## Purpose

Add a first-class integrations page to the REOS dashboard that does two jobs well:

- give operators a practical control surface for integrations that exist today
- show future integrations as realistic placeholders so product, QA, and engineering can see how they will behave before the APIs are available

This design is intentionally hybrid. It avoids a fake “everything is connected” dashboard, but it also avoids hiding roadmap integrations until the very end.

## Current Context

The current codebase already has:

- a workspace shell at `/app`
- integration readiness status via `/integrations/status`
- Azure topology metadata via `/architecture/azure`
- a local MVP with seeded data, imports, and deal workspaces

What is missing is an actual integration management surface. The user can see some readiness status, but cannot browse integrations as a catalog, inspect expected configuration, or test placeholder states.

## Problem To Solve

The master REOS document describes a platform that depends heavily on external systems:

- email and calendar
- property and market data
- investor systems
- KYC and compliance
- e-signature
- AI services
- messaging and internal operations

Without a dedicated integrations page, three problems remain:

1. operators cannot see which integrations are active, planned, or blocked
2. stakeholders cannot visualize how future integrations will fit into the platform
3. QA cannot exercise the UI shape of future integrations until APIs are ready

## Options Considered

### Option 1: Frontend-only mock page

Render a static integrations page with hardcoded cards and simple toggles.

**Pros**
- fastest to ship
- good for a quick demo

**Cons**
- no shared backend contract
- future API wiring becomes messy
- no realistic testing path

### Option 2: Config-driven integration control center

Create a backend catalog of integrations and expose it to a dedicated dashboard page. Real integrations pull readiness from the backend. Planned integrations use the same schema but are marked as placeholders.

**Pros**
- one contract for present and future integrations
- easy to extend
- realistic UI and testing surface
- useful now and later

**Cons**
- slightly more implementation work than a mock page

### Option 3: Full settings and secret-management subsystem

Build a full configuration product with persisted credentials, connection history, audit logs, and secret handling.

**Pros**
- strongest long-term architecture

**Cons**
- too heavy for the current MVP phase
- unnecessary before real API onboarding

## Recommendation

Choose **Option 2: Config-driven integration control center**.

It is the best balance between:

- immediate dashboard value
- truthful roadmap visualization
- minimal rework when real integrations arrive

## User Experience

Add a new route:

- `/app/integrations`

Add it to the workspace navigation beside:

- Command Center
- Import

The page should have four sections.

### 1. Integration Overview

Top-level summary cards for:

- connected
- enabled
- placeholders
- blocked
- ready for API hookup

Also include category filters:

- AI
- communications
- market data
- investor systems
- compliance
- signatures
- operations

### 2. Active and Configurable Integrations

These cards represent integrations that either already have some live readiness logic or should be treated as near-term configurable items.

Examples:

- Azure OpenAI
- Azure Blob Storage
- Azure AI Search
- Azure Service Bus
- Microsoft Graph
- Gmail
- Slack
- DocuSign

Each card should show:

- name
- category
- status badge
- enabled toggle
- auth type
- short config summary
- required env vars
- “Configure” action
- “Test” action

### 3. Planned Integrations

These cards are placeholders for systems that are not ready because the API is not yet integrated.

Examples:

- Alloy
- Juniper Square
- Yardi
- AppFolio
- CompStak
- Reonomy
- Calendly
- Zoom

Each placeholder should still look realistic:

- same card layout as active integrations
- placeholder badge
- future auth type
- expected config fields
- sample validation/test notes
- mock enable toggle for UI testing

### 4. Detail Panel

When the user selects an integration, show a side panel or expanded card area with:

- description
- mode: live or placeholder
- API readiness
- required credentials
- masked config fields
- implementation notes
- local testing notes
- future webhook or sync behavior where relevant

## Backend Design

Add a backend integration catalog endpoint that returns a normalized list of integrations.

Suggested fields:

- `key`
- `label`
- `category`
- `enabled`
- `status`
- `mode`
- `api_ready`
- `placeholder`
- `auth_type`
- `config_fields`
- `required_env_vars`
- `summary`
- `notes`
- `last_test_result`

Two categories of integration records should exist:

### Real-backed records

These pull from current runtime readiness and environment checks.

Examples:

- Azure OpenAI
- Azure Blob
- Azure AI Search
- Azure Service Bus
- Azure Functions
- Microsoft Entra ID

### Placeholder-backed records

These are static-but-structured records that model future integrations.

Examples:

- Alloy
- Juniper Square
- Calendly
- DocuSign
- Slack
- Zoom
- property data providers

## State Management

For the MVP phase:

- enable toggles can be persisted server-side in a lightweight config structure
- secrets should not be editable or stored in the frontend
- placeholder config values can be sample fields or empty masked values

This keeps the surface useful without pretending local secret management is solved.

## Security and Integrity

Do not:

- store real secrets in browser storage
- expose secret values in API responses
- imply that placeholder integrations are live

Do:

- mask config summaries
- separate `enabled` from `connected`
- clearly mark placeholder integrations
- show env var requirements for real-backed integrations

## Testing Strategy

Backend tests should verify:

- integration catalog endpoint returns real and placeholder records
- toggle updates persist correctly
- placeholder integrations are represented distinctly

Frontend verification should cover:

- page render
- filters
- toggle behavior
- detail panel rendering
- placeholder badge visibility

## Success Criteria

This feature is successful when:

- the dashboard has a dedicated integrations page
- current integrations have truthful readiness and config summaries
- future integrations appear with realistic placeholder UI
- toggles and configuration structure are easy to connect to real APIs later
- QA can test the page without waiting on external credentials

## Non-Goals For This Pass

- full secret vaulting
- OAuth handshake implementation
- webhook processing
- real third-party API connectivity
- enterprise policy enforcement per integration

Those belong in later phases once the actual integrations are being activated.
