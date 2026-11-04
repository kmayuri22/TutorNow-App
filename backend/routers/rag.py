"""
RAG (Retrieval-Augmented Generation) Learning Assistant Router
- Admin can upload PDF study materials
- Students ask questions, answered using local vector search + Ollama
- Uses ChromaDB for vector storage, sentence-transformers for embeddings
- Falls back gracefully if Ollama is not running
"""

import os
import uuid
import json
import httpx
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import auth
from pydantic import BaseModel

router = APIRouter(prefix="/api/rag", tags=["RAG Learning Assistant"])

# ── Paths ────────────────────────────────────────────────────────────────
RAG_UPLOADS_DIR = Path("rag_uploads")
RAG_UPLOADS_DIR.mkdir(exist_ok=True)
CHROMA_DB_DIR = Path("chroma_db")
CHROMA_DB_DIR.mkdir(exist_ok=True)

# Ollama config — uses local Ollama or env override
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# ── Lazy-loaded singletons ───────────────────────────────────────────────
_embedder = None
_chroma_collection = None

def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            raise HTTPException(503, f"Embedding model unavailable: {e}. Run: pip install sentence-transformers")
    return _embedder

def get_collection():
    global _chroma_collection
    if _chroma_collection is None:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=str(CHROMA_DB_DIR))
            _chroma_collection = client.get_or_create_collection(
                name="tutornow_knowledge",
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as e:
            raise HTTPException(503, f"ChromaDB unavailable: {e}. Run: pip install chromadb")
    return _chroma_collection

# ── Helpers ───────────────────────────────────────────────────────────────

def extract_text_from_pdf(path: str) -> str:
    """Extract all text from a PDF file."""
    try:
        import PyPDF2
        text = []
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text.strip())
        return "\n".join(text)
    except Exception as e:
        raise HTTPException(400, f"PDF extraction failed: {e}")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks

def is_ollama_running() -> bool:
    """Quick check whether Ollama is reachable."""
    try:
        resp = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3.0)
        return resp.status_code == 200
    except Exception:
        return False

def query_ollama(prompt: str) -> str:
    """Send a prompt to Ollama and return the text response."""
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 512},
                },
            )
        if resp.status_code == 200:
            return resp.json().get("response", "").strip()
        return f"Ollama returned status {resp.status_code}."
    except httpx.TimeoutException:
        return "Ollama timed out. The model may still be loading — try again in a moment."
    except Exception as e:
        return f"Could not reach Ollama: {e}"

# ── Schemas ───────────────────────────────────────────────────────────────

class RAGQuestionRequest(BaseModel):
    question: str
    subject: Optional[str] = None

class RAGDocument(BaseModel):
    id: str
    subject: str
    document_name: str
    chunk_count: int
    uploaded_by: str

# ── Admin endpoints ───────────────────────────────────────────────────────

@router.post("/admin/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form(...),
    document_name: str = Form(...),
    current_user: models.User = Depends(auth.RoleChecker(["Admin"])),
):
    """
    Admin: upload a PDF study material.
    Extracts text, chunks it, embeds, and stores in ChromaDB.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    # Save the PDF
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    save_path = RAG_UPLOADS_DIR / safe_name
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Extract and chunk
    raw_text = extract_text_from_pdf(str(save_path))
    if not raw_text.strip():
        save_path.unlink(missing_ok=True)
        raise HTTPException(400, "No readable text found in this PDF. It may be scanned or image-only.")

    chunks = chunk_text(raw_text)
    if not chunks:
        raise HTTPException(400, "Could not extract meaningful text chunks.")

    # Embed and store in ChromaDB
    embedder   = get_embedder()
    collection = get_collection()

    doc_id = uuid.uuid4().hex
    embeddings = embedder.encode(chunks).tolist()

    ids       = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "subject":       subject,
            "document_name": document_name,
            "chunk_index":   str(i),
            "doc_id":        doc_id,
            "file_path":     str(save_path),
            "uploaded_by":   current_user.name,
        }
        for i in range(len(chunks))
    ]

    collection.add(documents=chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)

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
    """Admin: list all indexed documents."""
    collection = get_collection()
    result = collection.get(include=["metadatas"])
    seen = {}
    for meta in (result.get("metadatas") or []):
        doc_id = meta.get("doc_id", "unknown")
        if doc_id not in seen:
            seen[doc_id] = {
                "id":            doc_id,
                "subject":       meta.get("subject", ""),
                "document_name": meta.get("document_name", ""),
                "uploaded_by":   meta.get("uploaded_by", ""),
                "chunk_count":   0,
            }
        seen[doc_id]["chunk_count"] += 1
    return list(seen.values())


@router.delete("/admin/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: models.User = Depends(auth.RoleChecker(["Admin"])),
):
    """Admin: delete a document and all its chunks from ChromaDB."""
    collection = get_collection()
    result = collection.get(where={"doc_id": doc_id}, include=["metadatas"])
    ids = result.get("ids", [])
    if not ids:
        raise HTTPException(404, "Document not found.")

    # Delete the PDF file if it exists
    metas = result.get("metadatas") or []
    if metas:
        file_path = metas[0].get("file_path", "")
        if file_path and Path(file_path).exists():
            Path(file_path).unlink(missing_ok=True)

    collection.delete(ids=ids)
    return {"message": f"Deleted {len(ids)} chunks for document '{doc_id}'."}


# ── Student question-answering endpoint ───────────────────────────────────

@router.post("/ask")
def ask_question(
    request: RAGQuestionRequest,
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Student: ask a question.
    1. Embed the question
    2. Retrieve top-k relevant chunks from ChromaDB
    3. Build a context-aware prompt
    4. Send to Ollama for answer generation
    5. Return answer + source info
    """
    if not request.question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    collection = get_collection()
    embedder   = get_embedder()

    # Check if knowledge base has any documents
    count = collection.count()
    if count == 0:
        return {
            "answer":  "The knowledge library is empty. Please ask your admin to upload study materials first.",
            "sources": [],
            "from_kb": False,
        }

    # Retrieve relevant chunks
    query_embedding = embedder.encode([request.question.strip()]).tolist()
    where_filter = {"subject": request.subject} if request.subject else None

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(4, count),
        where=where_filter if where_filter else None,
        include=["documents", "metadatas", "distances"],
    )

    docs      = results.get("documents",  [[]])[0]
    metas     = results.get("metadatas",  [[]])[0]
    distances = results.get("distances",  [[]])[0]

    # Filter by relevance threshold (cosine distance < 0.7 = meaningful match)
    THRESHOLD = 0.7
    relevant = [
        (d, m, dist)
        for d, m, dist in zip(docs, metas, distances)
        if dist < THRESHOLD
    ]

    sources = []
    for _, m, _ in relevant:
        src = {
            "document_name": m.get("document_name", "Unknown"),
            "subject":       m.get("subject", ""),
        }
        if src not in sources:
            sources.append(src)

    if not relevant:
        # Nothing found in KB — say so clearly, don't hallucinate
        return {
            "answer":  (
                "I couldn't find relevant information about this in the uploaded study materials. "
                "Please check if the correct subject materials have been uploaded by your admin, "
                "or try rephrasing your question."
            ),
            "sources": [],
            "from_kb": False,
        }

    # Build prompt with retrieved context
    context = "\n\n---\n\n".join([d for d, _, _ in relevant])
    prompt = (
        "You are a helpful educational assistant for TutorNow.\n"
        "Answer the student's question using ONLY the context provided below.\n"
        "If the answer is not in the context, say 'I could not find this in the study materials.'\n"
        "Be clear, concise and educational. Use simple language suitable for students.\n\n"
        f"CONTEXT FROM STUDY MATERIALS:\n{context}\n\n"
        f"STUDENT QUESTION: {request.question.strip()}\n\n"
        "ANSWER:"
    )

    # Try Ollama — fall back to a context-based summary if not available
    if is_ollama_running():
        answer = query_ollama(prompt)
    else:
        # Graceful fallback: return top chunk as answer with setup message
        top_chunk = relevant[0][0] if relevant else ""
        answer = (
            f"📚 From the study materials:\n\n{top_chunk[:600]}{'...' if len(top_chunk) > 600 else ''}\n\n"
            "──────────────────────────\n"
            "⚠️ For AI-generated answers, install and run Ollama:\n"
            "1. Download from https://ollama.com\n"
            f"2. Run: `ollama pull {OLLAMA_MODEL}`\n"
            "3. Start: `ollama serve`\n"
            "Once running, you'll get full AI-generated explanations."
        )

    return {
        "answer":  answer,
        "sources": sources,
        "from_kb": True,
    }


@router.get("/status")
def rag_status(current_user: models.User = Depends(auth.get_current_user)):
    """Check RAG system status: ChromaDB, embedder, Ollama."""
    status = {
        "chromadb":       False,
        "embedder":       False,
        "ollama_running": False,
        "ollama_model":   OLLAMA_MODEL,
        "document_count": 0,
        "ollama_url":     OLLAMA_BASE_URL,
    }
    try:
        collection = get_collection()
        status["chromadb"]       = True
        status["document_count"] = collection.count()
    except Exception as e:
        status["chromadb_error"] = str(e)

    try:
        get_embedder()
        status["embedder"] = True
    except Exception as e:
        status["embedder_error"] = str(e)

    status["ollama_running"] = is_ollama_running()
    return status


@router.get("/subjects")
def list_subjects(current_user: models.User = Depends(auth.get_current_user)):
    """Return unique subjects available in the knowledge base."""
    try:
        collection = get_collection()
        result = collection.get(include=["metadatas"])
        subjects = sorted(set(
            m.get("subject", "") for m in (result.get("metadatas") or []) if m.get("subject")
        ))
        return {"subjects": subjects}
    except Exception:
        return {"subjects": []}
