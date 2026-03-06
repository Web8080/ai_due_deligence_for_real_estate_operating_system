# Author: Victor.I
import hashlib
import json
import math
import os
import re
from typing import List, Tuple

import httpx
from sqlalchemy.orm import Session

from .models import Chunk

OLLAMA_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"
GEN_MODEL = "llama3.1:8b"
LOCAL_VECTOR_SIZE = 256


def chunk_text(text: str, size: int = 700, overlap: int = 100) -> List[str]:
    tokens = text.split()
    if not tokens:
        return []
    chunks = []
    i = 0
    while i < len(tokens):
        chunk = " ".join(tokens[i : i + size]).strip()
        if chunk:
            chunks.append(chunk)
        i += max(size - overlap, 1)
    return chunks


async def embed_text(text: str) -> List[float]:
    if os.getenv("REOS_AI_MODE", "").lower() == "local_fallback":
        return _local_embed(text)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": text},
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception:
            return _local_embed(text)


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1e-9
    norm_b = math.sqrt(sum(y * y for y in b)) or 1e-9
    return dot / (norm_a * norm_b)


def store_chunks(db: Session, deal_id: int, document_id: int, chunk_payloads: List[Tuple[str, List[float]]]) -> None:
    for content, embedding in chunk_payloads:
        db_chunk = Chunk(
            deal_id=deal_id,
            document_id=document_id,
            content=content,
            embedding=json.dumps(embedding),
        )
        db.add(db_chunk)
    db.commit()


def retrieve_top_chunks(db: Session, deal_id: int, query_embedding: List[float], top_k: int = 4) -> List[Chunk]:
    candidates = db.query(Chunk).filter(Chunk.deal_id == deal_id).all()
    scored = []
    for chunk in candidates:
        embedding = json.loads(chunk.embedding)
        scored.append((_cosine_similarity(query_embedding, embedding), chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:top_k]]


async def generate_grounded_answer(question: str, chunks: List[Chunk]) -> str:
    citations = [f"doc:{c.document_id}/chunk:{c.id}" for c in chunks]
    context = "\n\n".join([f"[{citations[i]}] {chunk.content}" for i, chunk in enumerate(chunks)])
    if os.getenv("REOS_AI_MODE", "").lower() == "local_fallback":
        return _local_generate_answer(question, chunks, citations)
    prompt = (
        "You are a real estate due diligence assistant. "
        "Use only the evidence in context. If evidence is weak, say so.\n\n"
        f"Question: {question}\n\nContext:\n{context}\n\n"
        "Respond with:\n"
        "1) concise answer\n"
        "2) uncertainties\n"
        "3) citations copied verbatim from context tags\n"
    )
    async with httpx.AsyncClient(timeout=90) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": GEN_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            return response.json()["response"]
        except Exception:
            return _local_generate_answer(question, chunks, citations)


def _local_embed(text: str) -> List[float]:
    vector = [0.0] * LOCAL_VECTOR_SIZE
    for token in re.findall(r"[a-zA-Z0-9]+", text.lower()):
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        index = int(digest[:8], 16) % LOCAL_VECTOR_SIZE
        vector[index] += 1.0
    norm = math.sqrt(sum(v * v for v in vector)) or 1e-9
    return [v / norm for v in vector]


def _local_generate_answer(question: str, chunks: List[Chunk], citations: List[str]) -> str:
    query_terms = set(re.findall(r"[a-zA-Z0-9]+", question.lower()))
    scored = []
    for i, chunk in enumerate(chunks):
        text = chunk.content.strip()
        if not text:
            continue
        terms = set(re.findall(r"[a-zA-Z0-9]+", text.lower()))
        overlap = len(query_terms.intersection(terms))
        scored.append((overlap, i, text))
    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored:
        return "Insufficient local evidence for a reliable answer."
    best = scored[0]
    snippet = best[2][:450].strip()
    cited = citations[best[1]]
    return (
        "Local fallback answer (extractive).\n"
        f"Best evidence: {snippet}\n"
        "Uncertainties: This answer is heuristic because Ollama is unavailable.\n"
        f"Citations: {cited}"
    )
