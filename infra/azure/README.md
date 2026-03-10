Author: Victor.I

# Azure Infrastructure Skeleton (Non-Production)

This folder contains starter infrastructure templates for aligning REOS with the Azure enterprise architecture narrative.

These templates are intentionally incomplete and should be treated as scaffolding, not production-ready infrastructure.

## Scope in this skeleton

- App Service Plan + Linux Web App placeholders
- Storage Account + Blob Container placeholders
- Service Bus Namespace + Queue placeholders
- Notes for Front Door, App Gateway, and API Management attachment points

## Required prerequisites before real deployment

- Azure subscription and tenant approved for production workloads
- Network design (vnet/subnet/private endpoints) reviewed by platform team
- Managed identity and RBAC assignments defined per environment
- Key Vault for all secrets and certificate material
- Separate resources for `dev`, `staging`, and `prod`

## Expected secret/config inputs

- `AZURE_CREDENTIALS` (GitHub Action service principal JSON)
- `AZURE_RESOURCE_GROUP`
- `AZURE_WEBAPP_NAME`
- `REOS_HEALTHCHECK_URL`
- Azure OpenAI endpoint/deployment settings
- Azure AI Search endpoint/index settings
- Azure Service Bus namespace/queue names

## Integration notes

- Front Door and Application Gateway are expected to front API Management.
- API Management should route to REOS backend App Service endpoints.
- Service Bus queue should trigger Function workers for document parsing and embeddings.
- Blob upload events should be correlated to queue jobs for replay-safe processing.
