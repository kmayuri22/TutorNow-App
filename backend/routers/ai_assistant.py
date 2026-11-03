"""
AI Learning Assistant Router
Provides AI-powered academic question answering for students.
Uses Google Gemini API (free tier) via direct REST calls.
API key is read from the GEMINI_API_KEY environment variable.
"""

import os
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

# Gemini API configuration - using current model (Nov 2026)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1/models/"
    "gemini-3.8-flash:generateContent"
)

# Debug: Log if API key is configured (don't log the actual key!)
if GEMINI_API_KEY:
    print(f"✓ Gemini API key is configured (length: {len(GEMINI_API_KEY)})")
else:
    print("✗ WARNING: GEMINI_API_KEY environment variable is not set!")

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


def _call_gemini(messages: list, subject: str) -> str:
    """
    Calls the Google Gemini API with the conversation history.
    Returns the AI response text.
    Raises HTTPException on failure.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please contact the administrator to set up the GEMINI_API_KEY."
        )

    # Build the conversation parts for Gemini
    # Gemini expects alternating user/model roles
    # We prepend the system prompt as the first user message
    contents = []

    # Add system context as the first turn
    contents.append({
        "role": "user",
        "parts": [{"text": f"{SYSTEM_PROMPT}\n\nSubject context: {subject}"}]
    })
    contents.append({
        "role": "model",
        "parts": [{"text": "Understood. I am ready to help students with their academic questions. Please ask your question."}]
    })

    # Add the conversation history
    for msg in messages:
        gemini_role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": gemini_role,
            "parts": [{"text": msg["content"]}]
        })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
            "topP": 0.9,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )

        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "Unknown AI error")
            raise HTTPException(
                status_code=502,
                detail=f"AI service error: {error_detail}"
            )

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(status_code=502, detail="AI returned no response. Please try again.")

        # Extract text from the first candidate
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise HTTPException(status_code=502, detail="AI response was empty. Please try again.")

        return parts[0].get("text", "").strip()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. Please try again.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach AI service: {str(e)}")


# ── Endpoints ────────────────────────────────

@router.get("/status")
def ai_status():
    """Diagnostic endpoint to check AI service configuration."""
    return {
        "api_key_configured": bool(GEMINI_API_KEY),
        "api_key_length": len(GEMINI_API_KEY) if GEMINI_API_KEY else 0,
        "api_url": GEMINI_API_URL
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
    ai_reply = _call_gemini(messages, subject)

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
    # Get distinct session IDs for this user, ordered by most recent
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
