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


class DealUpdateStage(BaseModel):
    stage: str


class DealOut(BaseModel):
    id: int
    name: str
    stage: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    contact_type: str = "investor"
    deal_id: Optional[int] = None


class ContactOut(BaseModel):
    id: int
    full_name: str
    email: Optional[str]
    contact_type: str
    deal_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: int
    deal_id: int
    filename: str
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


class IntegrationStatus(BaseModel):
    ai_provider: str
    azure_openai_configured: bool
    azure_blob_configured: bool
    azure_ad_configured: bool
    azure_key_vault_configured: bool
    automation_mode: str


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
