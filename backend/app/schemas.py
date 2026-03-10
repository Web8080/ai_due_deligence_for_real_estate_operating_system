# Author: Victor.I
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    username: str
    token: str
    role: str


class MeResponse(BaseModel):
    username: str
    role: str


class DealCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    source: Optional[str] = None
    priority: Optional[str] = "medium"
    owner_name: Optional[str] = None
    next_action: Optional[str] = None


class DealUpdateStage(BaseModel):
    stage: str


class DealOut(BaseModel):
    id: int
    name: str
    stage: str
    description: Optional[str]
    asset_type: Optional[str]
    city: Optional[str]
    state: Optional[str]
    source: Optional[str]
    priority: str
    owner_name: Optional[str]
    next_action: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    contact_type: str = "investor"
    title: Optional[str] = None
    phone: Optional[str] = None
    investor_type: Optional[str] = None
    company_name: Optional[str] = None
    deal_id: Optional[int] = None
    notes: Optional[str] = None


class ContactOut(BaseModel):
    id: int
    full_name: str
    email: Optional[str]
    contact_type: str
    title: Optional[str]
    phone: Optional[str]
    investor_type: Optional[str]
    company_id: Optional[int]
    deal_id: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: int
    deal_id: int
    filename: str
    document_type: str
    status: str
    summary: Optional[str]
    risk_tags: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    citations: List[str]


class SignupRequest(BaseModel):
    username: str
    password: str
    role: str = "analyst"


class SignupResponse(BaseModel):
    username: str
    role: str


class DealNoteCreate(BaseModel):
    content: str


class DealNoteOut(BaseModel):
    id: int
    deal_id: int
    author: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AIQueryLogOut(BaseModel):
    id: int
    deal_id: int
    username: str
    question: str
    answer: str
    citations: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    total_deals: int
    total_contacts: int
    total_documents: int
    stage_distribution: Dict[str, int]


class CompanyOut(BaseModel):
    id: int
    name: str
    company_type: str
    investor_type: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DiligenceItemOut(BaseModel):
    id: int
    deal_id: int
    title: str
    status: str
    severity: str
    owner_name: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DealStageEventOut(BaseModel):
    id: int
    deal_id: int
    from_stage: Optional[str]
    to_stage: str
    reason: Optional[str]
    author: str
    created_at: datetime

    class Config:
        from_attributes = True


class InvestorPipelineEntryOut(BaseModel):
    id: int
    deal_id: int
    contact_id: int
    status: str
    commitment_amount: int
    conviction: str
    last_signal: Optional[str]
    next_action: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WorkspaceOperationsSummary(BaseModel):
    high_priority_items: List[str]
    overdue_like_items: List[str]


class WorkspaceBootstrapResponse(BaseModel):
    analytics: AnalyticsSummary
    deals: List[DealOut]
    contacts: List[ContactOut]
    investor_pipeline: List[InvestorPipelineEntryOut]
    operations: WorkspaceOperationsSummary


class DemoSeedResponse(BaseModel):
    deals_created: int
    contacts_created: int
    investor_pipeline_entries_created: int


class CsvImportResponse(BaseModel):
    import_type: str
    rows_imported: int


class DealWorkspaceResponse(BaseModel):
    deal: DealOut
    documents: List[DocumentOut]
    diligence_items: List[DiligenceItemOut]
    stage_events: List[DealStageEventOut]
    notes: List[DealNoteOut]
    ai_history: List[AIQueryLogOut]
    investor_pipeline: List[InvestorPipelineEntryOut]
    operations_summary: List[str]


class IntegrationConfigField(BaseModel):
    key: str
    label: str
    value_hint: str
    secret: bool = False


class IntegrationStatus(BaseModel):
    runtime_mode: str
    ai_provider: str
    azure_openai_configured: bool
    azure_blob_configured: bool
    azure_ad_configured: bool
    azure_key_vault_configured: bool
    azure_front_door_configured: bool
    azure_app_gateway_configured: bool
    azure_api_management_configured: bool
    azure_service_bus_configured: bool
    azure_ai_search_configured: bool
    azure_functions_configured: bool
    automation_mode: str


class IntegrationModeUpdateRequest(BaseModel):
    mode: str


class IntegrationModeUpdateResponse(BaseModel):
    mode: str
    ai_provider: str
    message: str


class IntegrationCatalogItem(BaseModel):
    key: str
    label: str
    category: str
    status: str
    enabled: bool
    connected: bool
    mode: str
    placeholder: bool
    api_ready: bool
    auth_type: str
    summary: str
    notes: List[str]
    config_fields: List[IntegrationConfigField]
    required_env_vars: List[str]
    last_test_result: str


class IntegrationCatalogResponse(BaseModel):
    items: List[IntegrationCatalogItem]


class IntegrationToggleRequest(BaseModel):
    key: str
    enabled: bool


class IntegrationToggleResponse(BaseModel):
    key: str
    enabled: bool
    message: str


class AzureArchitectureNode(BaseModel):
    id: str
    label: str
    layer: str
    runtime: str


class AzureArchitectureEdge(BaseModel):
    source: str
    target: str
    flow: str


class AzureArchitectureResponse(BaseModel):
    title: str
    notes: List[str]
    nodes: List[AzureArchitectureNode]
    edges: List[AzureArchitectureEdge]
    deployment_stages: List[str]


class AutomationRecommendation(BaseModel):
    id: str
    title: str
    impact: str
    effort: str
    description: str
    risk_if_ignored: str


class AutomationRecommendationsResponse(BaseModel):
    recommendations: List[AutomationRecommendation]
    challenges: List[str]
