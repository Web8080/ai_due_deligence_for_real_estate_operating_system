# Author: Victor.I
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="analyst")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    stage = Column(String(64), nullable=False, default="Lead")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("Document", back_populates="deal")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    contact_type = Column(String(64), nullable=False, default="investor")
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
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
