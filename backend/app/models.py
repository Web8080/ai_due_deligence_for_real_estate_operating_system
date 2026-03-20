# Author: Victor.I
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="analyst")
    email = Column(String(255), nullable=True, unique=True)
    provider = Column(String(64), nullable=False, default="local")
    organization_name = Column(String(255), nullable=True)
    tenant_id = Column(String(128), nullable=True)
    display_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    company_type = Column(String(64), nullable=False, default="investor")
    investor_type = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contacts = relationship("Contact", back_populates="company")


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    stage = Column(String(64), nullable=False, default="Lead")
    description = Column(Text, nullable=True)
    asset_type = Column(String(64), nullable=True)
    city = Column(String(128), nullable=True)
    state = Column(String(64), nullable=True)
    source = Column(String(128), nullable=True)
    priority = Column(String(32), nullable=False, default="medium")
    owner_name = Column(String(128), nullable=True)
    next_action = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("Document", back_populates="deal")
    stage_events = relationship("DealStageEvent", back_populates="deal")
    diligence_items = relationship("DiligenceItem", back_populates="deal")
    investor_pipeline_entries = relationship("InvestorPipelineEntry", back_populates="deal")


class InvestorEmailSignal(Base):
    """Parsed investor intent from a pasted email (Graph/Gmail sync is a later phase)."""

    __tablename__ = "investor_email_signals"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True, index=True)
    sender_email = Column(String(255), nullable=False, index=True)
    sender_name = Column(String(255), nullable=True)
    subject_line = Column(String(512), nullable=True)
    body_excerpt = Column(Text, nullable=False)
    decision_inferred = Column(String(64), nullable=False, default="unknown")
    source = Column(String(64), nullable=False, default="paste")
    created_by = Column(String(128), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contact = relationship("Contact")
    company = relationship("Company")
    deal = relationship("Deal")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    contact_type = Column(String(64), nullable=False, default="investor")
    title = Column(String(128), nullable=True)
    phone = Column(String(64), nullable=True)
    investor_type = Column(String(64), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="contacts")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    document_type = Column(String(64), nullable=False, default="general")
    status = Column(String(64), nullable=False, default="processed")
    summary = Column(Text, nullable=True)
    risk_tags = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="documents")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, index=True, nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DealNote(Base):
    __tablename__ = "deal_notes"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    author = Column(String(64), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIQueryLog(Base):
    __tablename__ = "ai_query_logs"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    username = Column(String(64), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    citations = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DealStageEvent(Base):
    __tablename__ = "deal_stage_events"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    from_stage = Column(String(64), nullable=True)
    to_stage = Column(String(64), nullable=False)
    reason = Column(Text, nullable=True)
    author = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="stage_events")


class DiligenceItem(Base):
    __tablename__ = "diligence_items"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(64), nullable=False, default="open")
    severity = Column(String(32), nullable=False, default="medium")
    owner_name = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="diligence_items")


class InvestorPipelineEntry(Base):
    __tablename__ = "investor_pipeline_entries"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    status = Column(String(64), nullable=False, default="target")
    commitment_amount = Column(Integer, nullable=False, default=0)
    conviction = Column(String(32), nullable=False, default="medium")
    last_signal = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="investor_pipeline_entries")
    contact = relationship("Contact")


class IntegrationPreference(Base):
    __tablename__ = "integration_preferences"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), nullable=False, unique=True, index=True)
    enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String(64), nullable=False, default="local")
    session_token = Column(String(512), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(128), nullable=False)
    action = Column(String(128), nullable=False)
    entity_type = Column(String(128), nullable=False)
    entity_id = Column(String(128), nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(64), nullable=False, default="open")
    priority = Column(String(32), nullable=False, default="medium")
    owner_name = Column(String(128), nullable=True)
    workflow_stage = Column(String(128), nullable=True)
    due_context = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkflowException(Base):
    __tablename__ = "workflow_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(32), nullable=False, default="medium")
    status = Column(String(64), nullable=False, default="open")
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIRun(Base):
    __tablename__ = "ai_runs"

    id = Column(Integer, primary_key=True, index=True)
    workspace = Column(String(128), nullable=False)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True, index=True)
    actor = Column(String(128), nullable=False)
    provider = Column(String(64), nullable=False)
    model_name = Column(String(128), nullable=False)
    prompt = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)
    status = Column(String(64), nullable=False, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlaybookChecklistItem(Base):
    """Tracks which automation playbook theme groups each user has marked complete."""

    __tablename__ = "playbook_checklist_items"
    __table_args__ = (UniqueConstraint("user_id", "group_key", name="uq_playbook_user_group"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_key = Column(String(32), nullable=False)
    complete = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
