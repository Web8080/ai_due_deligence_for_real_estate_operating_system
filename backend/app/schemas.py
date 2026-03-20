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
    provider: str = "local"


class MeResponse(BaseModel):
    username: str
    role: str
    provider: str = "local"


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
    email: Optional[str] = None
    display_name: Optional[str] = None
    organization_name: Optional[str] = None


class SignupResponse(BaseModel):
    username: str
    role: str
    message: Optional[str] = None


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


class CompanyCreate(BaseModel):
    name: str
    company_type: str = "investor"
    investor_type: Optional[str] = None
    notes: Optional[str] = None


class CompanyUpdate(BaseModel):
    notes: Optional[str] = None
    investor_type: Optional[str] = None
    company_type: Optional[str] = None


class CompanyDetailOut(BaseModel):
    id: int
    name: str
    company_type: str
    investor_type: Optional[str]
    notes: Optional[str]
    created_at: datetime
    contact_count: int = 0

    class Config:
        from_attributes = True


class CRMContactRow(BaseModel):
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
    company_name: Optional[str] = None


class ContactUpdate(BaseModel):
    notes: Optional[str] = None
    investor_type: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None


class EmailImportPreviewRequest(BaseModel):
    raw_text: str


class EmailDetectedParty(BaseModel):
    email: str
    full_name_guess: Optional[str] = None
    company_guess: Optional[str] = None
    decision_hint: str
    rationale: str


class EmailImportPreviewResponse(BaseModel):
    detected: List[EmailDetectedParty]
    integration_note: str


class EmailImportCommitItem(BaseModel):
    email: str
    full_name: str
    company_name: Optional[str] = None
    investor_type: Optional[str] = None
    decision_hint: str


class EmailImportCommitRequest(BaseModel):
    deal_id: Optional[int] = None
    subject: Optional[str] = None
    body_excerpt: Optional[str] = None
    create_contacts: bool = True
    apply_pipeline: bool = True
    items: List[EmailImportCommitItem]


class EmailImportCommitResponse(BaseModel):
    signals_created: int
    contacts_created: int
    contacts_matched: int
    pipeline_updates: int
    message: str


class InvestorEmailSignalOut(BaseModel):
    id: int
    contact_id: Optional[int]
    company_id: Optional[int]
    deal_id: Optional[int]
    sender_email: str
    sender_name: Optional[str]
    subject_line: Optional[str]
    body_excerpt: str
    decision_inferred: str
    source: str
    created_by: str
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
    workflow_tasks_added: int = 0
    workflow_exceptions_added: int = 0
    deal_notes_added: int = 0
    documents_added: int = 0
    ai_query_logs_added: int = 0
    ai_runs_added: int = 0
    audit_events_added: int = 0
    chunks_added: int = 0


class CsvImportResponse(BaseModel):
    import_type: str
    rows_imported: int


class DealDecisionSurface(BaseModel):
    """
    Rules-based decision draft for the deal workspace. Human committee / IC is always authoritative.
    Verdict answers: should we keep spending attention on this name, and what blocks a clean decision?
    """

    current_verdict: str
    confidence: int
    confidence_rationale: str
    key_assumptions: List[str]
    downside_scenario: str
    top_risks: List[str]
    blocking_gaps: List[str]
    next_best_actions: List[str]
    document_dd_checks: List[str]
    investor_posture_summary: str
    automation_note: str


class DealWorkspaceResponse(BaseModel):
    deal: DealOut
    documents: List[DocumentOut]
    diligence_items: List[DiligenceItemOut]
    stage_events: List[DealStageEventOut]
    notes: List[DealNoteOut]
    ai_history: List[AIQueryLogOut]
    investor_pipeline: List[InvestorPipelineEntryOut]
    operations_summary: List[str]
    decision_surface: DealDecisionSurface


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
    product_demo_mode: bool = False
    demo_notice: str = ""


class IntegrationToggleRequest(BaseModel):
    key: str
    enabled: bool


class IntegrationToggleResponse(BaseModel):
    key: str
    enabled: bool
    message: str


class AuthProviderItem(BaseModel):
    key: str
    label: str
    available: bool
    primary: bool
    auth_url: Optional[str] = None
    description: str


class AuthProvidersResponse(BaseModel):
    providers: List[AuthProviderItem]
    local_recovery_enabled: bool
    local_signup_enabled: bool = False
    product_demo_mode: bool = False


class AuthGrantExchangeRequest(BaseModel):
    grant: str


class LogoutResponse(BaseModel):
    message: str


class AICopilotRequest(BaseModel):
    workspace: str
    prompt: str
    deal_id: Optional[int] = None


class AICopilotResponse(BaseModel):
    answer: str
    provider: str
    model_name: str
    workspace: str


class PortfolioOverviewResponse(BaseModel):
    analytics: AnalyticsSummary
    stage_distribution: Dict[str, int]
    committee_queue: List[str]
    watchlist: List[str]
    investor_momentum: List[str]
    workflow_exceptions: List[str]
    ai_briefing: str


class DealsOverviewResponse(BaseModel):
    analytics: AnalyticsSummary
    intake_summary: List[str]
    active_diligence: List[DealOut]
    closing_pipeline: List[DealOut]


class LeadsOverviewResponse(BaseModel):
    lead_deals: List[DealOut]
    origination_signals: List[str]
    outreach_queue: List[str]
    ai_briefing: str
    apollo: LeadsApolloConnectorStub
    apollo_prospects: List[ApolloProspectOut]


class CRMOverviewResponse(BaseModel):
    contacts: List[CRMContactRow]
    companies: List[CompanyOut]
    relationship_signals: List[str]
    ai_briefing: str
    email_integration_hint: str


class InvestorActionHint(BaseModel):
    pipeline_entry_id: int
    deal_id: int
    hint: str
    urgency: str


class InvestorsOverviewResponse(BaseModel):
    investor_pipeline: List[InvestorPipelineEntryOut]
    focus_notes: List[str]
    onboarding_status: List[str]
    ai_briefing: str
    conversion_action_hints: List[InvestorActionHint]


class DocumentsLibraryResponse(BaseModel):
    total_documents: int
    documents: List[DocumentOut]
    document_signals: List[str]
    ai_briefing: str


class OperationsOverviewResponse(BaseModel):
    tasks: List[str]
    exceptions: List[str]
    automation_priorities: List[str]
    ai_briefing: str


class GovernanceOverviewResponse(BaseModel):
    audit_events: List[str]
    ai_run_count: int
    session_count: int
    controls: List[str]
    guardrails: List[str]
    hallucination_controls: List[str]
    external_placeholders: List[str]
    ai_runtime_notes: List[str]


class AdminOverviewResponse(BaseModel):
    users: List[str]
    providers: List[str]
    integration_status: List[str]
    operating_modes: List[str]


class ReportsOverviewResponse(BaseModel):
    report_queue: List[str]
    executive_brief: str


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


class ApolloProspectOut(BaseModel):
    person_name: str
    title: str
    organization: str
    fit_score: int
    icp_match: str
    ai_note: str


class LeadsApolloConnectorStub(BaseModel):
    status: str
    last_sync_display: str
    api_env_key: str
    narrative: str


class LeadsAiRankedDeal(BaseModel):
    deal_id: int
    name: str
    stage: str
    priority: str
    fit_score: int
    rationale: str


class LeadsAiFitPreviewResponse(BaseModel):
    generated_at: str
    model_route: str
    ranked: List[LeadsAiRankedDeal]
    summary: str


class DashboardKpi(BaseModel):
    label: str
    value: str
    change: str
    change_positive: bool = True


class DashboardMarketPoint(BaseModel):
    month: str
    median_sale_price: float
    inventory: int


class DashboardTask(BaseModel):
    assignee: str
    description: str
    time_ago: str


class DashboardPipelineStage(BaseModel):
    name: str
    count: int
    value: float
    color: str


class DashboardTopProperty(BaseModel):
    address: str
    agent: str
    price: float


class DashboardTopAgent(BaseModel):
    name: str
    sales_count: int
    total_sales: float


class DashboardActivity(BaseModel):
    title: str
    due: str


class OperatingCapabilityRow(BaseModel):
    """Maps a core operator problem to a concrete app surface (OS coverage checklist)."""

    id: str
    problem: str
    status: str
    route_path: str
    route_label: str
    detail: str


class DecisionVelocityMetric(BaseModel):
    label: str
    value: str


class DecisionVelocitySummary(BaseModel):
    """Proxy KPIs for time from deal intake toward committee-quality decisions — see methodology_note."""

    headline: str
    primary_value: str
    primary_subtext: str
    metrics: List[DecisionVelocityMetric]
    median_days_to_diligence: str
    median_days_in_investment_committee: str
    methodology_note: str


class DashboardDataResponse(BaseModel):
    kpis: List[DashboardKpi]
    revenue_forecast: Dict[str, str]
    market_trends: List[DashboardMarketPoint]
    tasks: List[DashboardTask]
    sales_pipeline: List[DashboardPipelineStage]
    top_properties: List[DashboardTopProperty]
    top_agents: List[DashboardTopAgent]
    activity_feed: List[DashboardActivity]
    performance_score: int
    performance_max: int
    performance_label: str
    performance_subtitle: str
    operating_capabilities: List[OperatingCapabilityRow]
    decision_velocity: DecisionVelocitySummary


class PlaybookChecklistRow(BaseModel):
    group_key: str
    complete: bool


class PlaybookChecklistResponse(BaseModel):
    items: List[PlaybookChecklistRow]


class PlaybookChecklistToggleRequest(BaseModel):
    group_key: str


class ExecutiveBriefingResponse(BaseModel):
    lines: List[str]


class CRMGraphNode(BaseModel):
    id: str
    label: str
    node_type: str


class CRMGraphEdge(BaseModel):
    source: str
    target: str
    relation: str


class CRMGraphResponse(BaseModel):
    nodes: List[CRMGraphNode]
    edges: List[CRMGraphEdge]
