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

OLLAMA_URL = os.getenv("REOS_OLLAMA_URL", "http://localhost:11434").rstrip("/")
EMBED_MODEL = "nomic-embed-text"
GEN_MODEL = "llama3.1:8b"
LOCAL_VECTOR_SIZE = 256
AZURE_API_VERSION = os.getenv("REOS_AZURE_OPENAI_API_VERSION", "2024-02-15-preview")


def current_ai_provider() -> str:
    return os.getenv("REOS_AI_PROVIDER", "ollama").strip().lower()


def ollama_server_reachable(timeout: float = 2.0) -> bool:
    """Best-effort probe; used for health/governance display only."""
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f"{OLLAMA_URL}/api/tags")
            return response.status_code == 200
    except Exception:
        return False


def current_ai_model() -> str:
    provider = current_ai_provider()
    if provider == "azure_openai" and _azure_openai_ready():
        return os.getenv("REOS_AZURE_OPENAI_CHAT_DEPLOYMENT", "azure-openai-chat")
    return os.getenv("REOS_OLLAMA_GEN_MODEL", GEN_MODEL)


def _azure_openai_ready() -> bool:
    required = [
        os.getenv("REOS_AZURE_OPENAI_ENDPOINT"),
        os.getenv("REOS_AZURE_OPENAI_API_KEY"),
        os.getenv("REOS_AZURE_OPENAI_CHAT_DEPLOYMENT"),
        os.getenv("REOS_AZURE_OPENAI_EMBED_DEPLOYMENT"),
    ]
    return all(required)


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
    provider = current_ai_provider()
    if provider == "azure_openai" and _azure_openai_ready():
        try:
            return await _embed_with_azure(text)
        except Exception:
            pass
    try:
        return await _embed_with_ollama(text)
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
    provider = current_ai_provider()
    if provider == "azure_openai" and _azure_openai_ready():
        try:
            return await _generate_with_azure(prompt)
        except Exception:
            pass
    try:
        return await _generate_with_ollama(prompt)
    except Exception:
        return _local_generate_answer(question, chunks, citations)


async def generate_workspace_answer(prompt: str, workspace: str, context: str) -> str:
    system_prompt = (
        "You are the REOS operating copilot. Keep answers concise, factual, and operational. "
        "Prioritize blockers, next actions, risk, and investor or workflow impact."
    )
    combined_prompt = f"{system_prompt}\n\nWorkspace: {workspace}\n\nContext:\n{context}\n\nRequest: {prompt}"
    if os.getenv("REOS_AI_MODE", "").lower() == "local_fallback":
        return _local_workspace_answer(workspace, prompt, context)
    provider = current_ai_provider()
    if provider == "azure_openai" and _azure_openai_ready():
        try:
            return await _generate_with_azure(combined_prompt)
        except Exception:
            pass
    try:
        return await _generate_with_ollama(combined_prompt)
    except Exception:
        return _local_workspace_answer(workspace, prompt, context)


async def _embed_with_ollama(text: str) -> List[float]:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        response.raise_for_status()
        return response.json()["embedding"]


async def _generate_with_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": GEN_MODEL, "prompt": prompt, "stream": False},
        )
        response.raise_for_status()
        return response.json()["response"]


async def _embed_with_azure(text: str) -> List[float]:
    endpoint = os.getenv("REOS_AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    api_key = os.getenv("REOS_AZURE_OPENAI_API_KEY", "")
    embed_deployment = os.getenv("REOS_AZURE_OPENAI_EMBED_DEPLOYMENT", "")
    url = f"{endpoint}/openai/deployments/{embed_deployment}/embeddings"
    params = {"api-version": AZURE_API_VERSION}
    headers = {"api-key": api_key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, params=params, headers=headers, json={"input": text})
        response.raise_for_status()
        payload = response.json()
        return payload["data"][0]["embedding"]


async def _generate_with_azure(prompt: str) -> str:
    endpoint = os.getenv("REOS_AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    api_key = os.getenv("REOS_AZURE_OPENAI_API_KEY", "")
    chat_deployment = os.getenv("REOS_AZURE_OPENAI_CHAT_DEPLOYMENT", "")
    url = f"{endpoint}/openai/deployments/{chat_deployment}/chat/completions"
    params = {"api-version": AZURE_API_VERSION}
    headers = {"api-key": api_key, "Content-Type": "application/json"}
    body = {
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(url, params=params, headers=headers, json=body)
        response.raise_for_status()
        payload = response.json()
        return payload["choices"][0]["message"]["content"]


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


def _local_workspace_answer(workspace: str, prompt: str, context: str) -> str:
    lines = [line.strip() for line in context.splitlines() if line.strip()]
    selected = lines[:5]
    if not selected:
        return f"{workspace.title()} copilot could not find enough context to answer this request reliably."
    return (
        f"{workspace.title()} copilot fallback summary.\n"
        f"Request: {prompt}\n"
        f"Key context: {' '.join(selected[:3])}\n"
        "Next move: review the active queue and confirm priorities before acting."
    )
