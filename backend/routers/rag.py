"""
RAG (Retrieval-Augmented Generation) Learning Assistant Router
- Admin uploads PDF study materials
- Text is extracted, chunked, and stored as JSON files (no heavy dependencies)
- Students ask questions — relevant chunks are retrieved using keyword/TF-IDF scoring
- Groq API (already configured) generates the final answer from retrieved context
- Zero new dependencies beyond what is already installed (httpx, PyPDF2)
"""

import os
import re
import uuid
import json
import math
import httpx
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
import models
import auth
from pydantic import BaseModel

load_dotenv()

router = APIRouter(prefix="/api/rag", tags=["RAG Learning Assistant"])

# ── Storage paths (plain JSON files — no DB needed) ──────────────────────
RAG_UPLOADS_DIR = Path("rag_uploads")
RAG_INDEX_FILE  = Path("rag_uploads") / "index.json"
RAG_UPLOADS_DIR.mkdir(exist_ok=True)

# ── Groq API (reuse existing key) ────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "openai/gpt-oss-20b"

# ── Index helpers ─────────────────────────────────────────────────────────

def load_index() -> dict:
    """Load the JSON index that stores all document chunks."""
    if RAG_INDEX_FILE.exists():
        try:
            return json.loads(RAG_INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"documents": [], "chunks": []}

def save_index(index: dict):
    RAG_INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

# ── Text processing ───────────────────────────────────────────────────────

def extract_text_from_pdf(path: str) -> str:
    try:
        import PyPDF2
        text_parts = []
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t.strip())
        return "\n".join(text_parts)
    except ImportError:
        raise HTTPException(503, "PyPDF2 not installed. Run: pip install pypdf2")
    except Exception as e:
        raise HTTPException(400, f"PDF extraction failed: {e}")

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 80) -> List[str]:
    words  = text.split()
    chunks = []
    start  = 0
    while start < len(words):
        end   = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks

def tokenize(text: str) -> List[str]:
    return re.findall(r"\b[a-z0-9]+\b", text.lower())

def tf_idf_score(query_tokens: List[str], chunk: str, all_chunks: List[str]) -> float:
    """Simple TF-IDF relevance score between a query and a chunk."""
    chunk_tokens = tokenize(chunk)
    if not chunk_tokens:
        return 0.0
    N = len(all_chunks)
    score = 0.0
    for qt in query_tokens:
        tf  = chunk_tokens.count(qt) / len(chunk_tokens)
        df  = sum(1 for c in all_chunks if qt in tokenize(c))
        idf = math.log((N + 1) / (df + 1)) + 1
        score += tf * idf
    return score

def retrieve_chunks(question: str, subject: Optional[str], index: dict, top_k: int = 4) -> list:
    """Return the top_k most relevant chunks for the question."""
    all_chunks = index.get("chunks", [])
    if not all_chunks:
        return []

    # Filter by subject if specified
    pool = [c for c in all_chunks if not subject or c["subject"].lower() == subject.lower()]
    if not pool:
        pool = all_chunks  # fall back to all subjects

    query_tokens = tokenize(question)
    scored = [(tf_idf_score(query_tokens, c["text"], [x["text"] for x in pool]), c) for c in pool]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for score, c in scored[:top_k] if score > 0]

# ── Groq call ─────────────────────────────────────────────────────────────

def call_groq(system_msg: str, user_msg: str) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(503, "GROQ_API_KEY is not configured on the server.")
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user",   "content": user_msg},
                    ],
                    "temperature": 0.3,
                    "max_tokens":  600,
                },
            )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
        error = resp.json().get("error", {}).get("message", "Unknown error")
        raise HTTPException(502, f"Groq API error: {error}")
    except httpx.TimeoutException:
        raise HTTPException(504, "Groq API timed out. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Could not reach Groq API: {e}")

# ── Schemas ───────────────────────────────────────────────────────────────

class RAGQuestionRequest(BaseModel):
    question: str
    subject: Optional[str] = None

# ── Admin endpoints ───────────────────────────────────────────────────────

@router.post("/admin/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form(...),
    document_name: str = Form(...),
    current_user: models.User = Depends(auth.RoleChecker(["Admin"])),
):
    """Admin: upload a PDF, extract text, chunk it, store in JSON index."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    save_path = RAG_UPLOADS_DIR / safe_name
    content   = await file.read()
    save_path.write_bytes(content)

    raw_text = extract_text_from_pdf(str(save_path))
    if not raw_text.strip():
        save_path.unlink(missing_ok=True)
        raise HTTPException(400, "No readable text found in this PDF. It may be a scanned image-only PDF.")

    chunks = chunk_text(raw_text)
    if not chunks:
        raise HTTPException(400, "Could not extract meaningful text chunks.")

    doc_id = uuid.uuid4().hex
    index  = load_index()

    index["documents"].append({
        "id":            doc_id,
        "subject":       subject,
        "document_name": document_name,
        "file_path":     str(save_path),
        "uploaded_by":   current_user.name,
        "chunk_count":   len(chunks),
    })

    for i, chunk in enumerate(chunks):
        index["chunks"].append({
            "id":            f"{doc_id}_{i}",
            "doc_id":        doc_id,
            "subject":       subject,
            "document_name": document_name,
            "text":          chunk,
        })

    save_index(index)

    return {
        "message":       f"Uploaded and indexed '{document_name}' with {len(chunks)} chunks.",
        "doc_id":        doc_id,
        "subject":       subject,
        "document_name": document_name,
        "chunk_count":   len(chunks),
    }


@router.get("/admin/documents")
def list_documents(
    current_user: models.User = Depends(auth.RoleChecker(["Admin"])),
):
    index = load_index()
    return index.get("documents", [])


@router.delete("/admin/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: models.User = Depends(auth.RoleChecker(["Admin"])),
):
    index = load_index()
    docs   = [d for d in index.get("documents", []) if d["id"] != doc_id]
    chunks = [c for c in index.get("chunks",    []) if c["doc_id"] != doc_id]

    if len(docs) == len(index.get("documents", [])):
        raise HTTPException(404, "Document not found.")

    # Remove PDF file
    deleted_doc = next((d for d in index.get("documents", []) if d["id"] == doc_id), None)
    if deleted_doc:
        fp = Path(deleted_doc.get("file_path", ""))
        if fp.exists():
            fp.unlink(missing_ok=True)

    index["documents"] = docs
    index["chunks"]    = chunks
    save_index(index)
    return {"message": f"Deleted document '{doc_id}' and its chunks."}


# ── Student question-answering ─────────────────────────────────────────────

@router.post("/ask")
def ask_question(
    request: RAGQuestionRequest,
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Student: ask a question.
    1. Retrieve relevant chunks via TF-IDF keyword scoring
    2. Build a grounded prompt with retrieved context
    3. Send to Groq for answer generation
    4. Return answer + source book names
    """
    if not request.question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    index = load_index()

    if not index.get("chunks"):
        return {
            "answer":  "📚 The knowledge library is empty. Please ask your admin to upload study materials first.",
            "sources": [],
            "from_kb": False,
        }

    relevant = retrieve_chunks(request.question.strip(), request.subject, index, top_k=4)

    if not relevant:
        return {
            "answer":  (
                "I couldn't find relevant information about this in the uploaded study materials. "
                "Please check if the correct subject materials have been uploaded, "
                "or try rephrasing your question."
            ),
            "sources": [],
            "from_kb": False,
        }

    # Build sources list
    seen_sources = []
    for c in relevant:
        src = {"document_name": c["document_name"], "subject": c["subject"]}
        if src not in seen_sources:
            seen_sources.append(src)

    # Build grounded prompt
    context = "\n\n---\n\n".join(c["text"] for c in relevant)
    system_msg = (
        "You are a helpful educational assistant for TutorNow.\n"
        "Answer the student's question using ONLY the context provided below.\n"
        "If the answer is not in the context, say exactly: "
        "'I could not find this in the uploaded study materials.'\n"
        "Be clear, concise, and educational. Use simple language for students.\n"
        "Do NOT make up information not present in the context."
    )
    user_msg = (
        f"CONTEXT FROM STUDY MATERIALS:\n{context}\n\n"
        f"STUDENT QUESTION: {request.question.strip()}\n\n"
        "ANSWER:"
    )

    answer = call_groq(system_msg, user_msg)

    return {
        "answer":  answer,
        "sources": seen_sources,
        "from_kb": True,
    }


# ── Status & subjects ─────────────────────────────────────────────────────

@router.get("/status")
def rag_status(current_user: models.User = Depends(auth.get_current_user)):
    index = load_index()
    total_chunks = len(index.get("chunks", []))
    total_docs   = len(index.get("documents", []))
    return {
        "chromadb":       True,   # not used — kept for UI compatibility
        "embedder":       True,   # not used — kept for UI compatibility
        "ollama_running": bool(GROQ_API_KEY),
        "ollama_model":   GROQ_MODEL,
        "document_count": total_chunks,
        "total_documents": total_docs,
        "ollama_url":     GROQ_API_URL,
        "engine":         "Groq API + TF-IDF retrieval",
    }


@router.get("/subjects")
def list_subjects(current_user: models.User = Depends(auth.get_current_user)):
    index    = load_index()
    subjects = sorted(set(
        c["subject"] for c in index.get("chunks", []) if c.get("subject")
    ))
    return {"subjects": subjects}
