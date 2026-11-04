"""
AI Learning Assistant Router
Provides AI-powered academic question answering for students.
Uses Groq API (free tier) via OpenAI-compatible REST calls.
API key is read from the GROQ_API_KEY environment variable.
Get a free key at: https://console.groq.com/keys
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/ai", tags=["AI Learning Assistant"])

# Groq API configuration - OpenAI-compatible endpoint
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

# Debug: Log if API key is configured (don't log the actual key!)
if GROQ_API_KEY:
    print(f"✓ Groq API key is configured (length: {len(GROQ_API_KEY)})")
else:
    print("✗ WARNING: GROQ_API_KEY environment variable is not set!")

SYSTEM_PROMPT = (
    "You are an AI Learning Assistant for TutorNow, an educational platform. "
    "Your role is to help students understand academic concepts clearly and accurately. "
    "Always:\n"
    "- Provide step-by-step explanations for problem-solving questions.\n"
    "- Use simple English that students can easily understand.\n"
    "- Include relevant examples wherever helpful.\n"
    "- Keep answers focused and educational.\n"
    "- If the question is not academic, politely redirect the student to ask academic questions.\n"
    "- Never provide harmful, inappropriate, or off-topic content."
)

SUPPORTED_SUBJECTS = [
    "Mathematics", "Physics", "Chemistry", "Biology",
    "Computer Science", "English", "History", "Geography",
    "Economics", "General"
]


def _call_groq(messages: list, subject: str) -> str:
    """
    Calls the Groq API (OpenAI-compatible) with the conversation history.
    Returns the AI response text.
    Raises HTTPException on failure.
    """
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please contact the administrator to set up the GROQ_API_KEY."
        )

    # Build messages in OpenAI format
    # System message sets the assistant's behaviour
    chat_messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nSubject context: {subject}"
        }
    ]

    # Append conversation history and current user message
    for msg in messages:
        chat_messages.append({
            "role": msg["role"],          # "user" or "assistant"
            "content": msg["content"]
        })

    payload = {
        "model": GROQ_MODEL,
        "messages": chat_messages,
        "temperature": 0.7,
        "max_tokens": 1024,
        "top_p": 0.9,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                GROQ_API_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                }
            )

        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "Unknown AI error")
            raise HTTPException(
                status_code=502,
                detail=f"AI service error: {error_detail}"
            )

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise HTTPException(status_code=502, detail="AI returned no response. Please try again.")

        return choices[0].get("message", {}).get("content", "").strip()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. Please try again.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach AI service: {str(e)}")


# ── Endpoints ────────────────────────────────

@router.get("/status")
def ai_status():
    """Diagnostic endpoint to check AI service configuration."""
    return {
        "provider": "Groq",
        "model": GROQ_MODEL,
        "api_key_configured": bool(GROQ_API_KEY),
        "api_key_length": len(GROQ_API_KEY) if GROQ_API_KEY else 0,
        "api_url": GROQ_API_URL,
    }


@router.post("/chat", response_model=schemas.AIChatResponse)
def chat_with_ai(
    request: schemas.AIChatRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to the AI Learning Assistant.
    Maintains conversation context using session_id.
    Students only — authenticated via JWT.
    """
    # Validate message
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(request.message.strip()) > 2000:
        raise HTTPException(status_code=400, detail="Message is too long. Please keep it under 2000 characters.")

    subject = request.subject or "General"

    # Create or reuse conversation session
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())

    # Load existing conversation history for context (last 10 messages)
    history = (
        db.query(models.AIChatMessage)
        .filter(
            models.AIChatMessage.user_id == current_user.id,
            models.AIChatMessage.session_id == session_id
        )
        .order_by(models.AIChatMessage.created_at.asc())
        .limit(10)
        .all()
    )

    # Build messages list for the AI
    messages = [{"role": msg.role, "content": msg.content} for msg in history]
    messages.append({"role": "user", "content": request.message.strip()})

    # Call AI
    ai_reply = _call_groq(messages, subject)

    # Save student message to DB
    user_msg = models.AIChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=request.message.strip(),
        subject=subject,
    )
    db.add(user_msg)

    # Save AI response to DB
    ai_msg = models.AIChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=ai_reply,
        subject=subject,
    )
    db.add(ai_msg)
    db.commit()

    return schemas.AIChatResponse(reply=ai_reply, session_id=session_id)


@router.get("/history", response_model=List[schemas.AIChatSessionSummary])
def get_chat_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns a list of the student's past AI conversation sessions.
    Each entry is the first message of a session (for display in history list).
    """
    sessions_raw = (
        db.query(
            models.AIChatMessage.session_id,
            func.min(models.AIChatMessage.subject).label("subject"),
            func.min(models.AIChatMessage.content).label("first_message"),
            func.min(models.AIChatMessage.created_at).label("created_at"),
            func.count(models.AIChatMessage.id).label("message_count"),
        )
        .filter(
            models.AIChatMessage.user_id == current_user.id,
            models.AIChatMessage.role == "user"
        )
        .group_by(models.AIChatMessage.session_id)
        .order_by(func.min(models.AIChatMessage.created_at).desc())
        .limit(20)
        .all()
    )

    return [
        schemas.AIChatSessionSummary(
            session_id=s.session_id,
            subject=s.subject,
            first_message=s.first_message[:100] + ("..." if len(s.first_message) > 100 else ""),
            created_at=s.created_at,
            message_count=s.message_count,
        )
        for s in sessions_raw
    ]


@router.get("/history/{session_id}", response_model=List[schemas.AIChatMessageResponse])
def get_session_messages(
    session_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all messages in a specific conversation session.
    Only returns messages belonging to the authenticated student.
    """
    messages = (
        db.query(models.AIChatMessage)
        .filter(
            models.AIChatMessage.user_id == current_user.id,
            models.AIChatMessage.session_id == session_id
        )
        .order_by(models.AIChatMessage.created_at.asc())
        .all()
    )

    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return messages


@router.delete("/history/{session_id}")
def delete_chat_session(
    session_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes all messages in a specific conversation session for this student."""
    deleted = (
        db.query(models.AIChatMessage)
        .filter(
            models.AIChatMessage.user_id == current_user.id,
            models.AIChatMessage.session_id == session_id
        )
        .delete(synchronize_session=False)
    )
    db.commit()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return {"message": "Conversation deleted successfully."}
