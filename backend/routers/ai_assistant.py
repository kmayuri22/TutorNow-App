"""
AI Learning Assistant Router
Provides AI-powered academic question answering for students.
Uses Groq API (free tier) via OpenAI-compatible REST calls.
Also recommends the best tutors from the database when students ask about finding a tutor.
"""

import os
import re
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import uuid
import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/ai", tags=["AI Learning Assistant"])

# Groq API configuration - OpenAI-compatible endpoint
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-20b"

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
    "- Never provide harmful, inappropriate, or off-topic content.\n"
    "- When tutor recommendations are provided to you, present them in a friendly, structured way "
    "  highlighting each tutor's name, rating, experience, hourly rate, and subjects."
)

# Keywords that suggest the student is looking for a tutor
TUTOR_REQUEST_KEYWORDS = [
    "find tutor", "find a tutor", "suggest tutor", "suggest a tutor",
    "recommend tutor", "recommend a tutor", "best tutor", "good tutor",
    "need a tutor", "need tutor", "looking for tutor", "looking for a tutor",
    "hire tutor", "hire a tutor", "get a tutor", "want a tutor",
    "tutor for", "tutor who teaches", "who teaches", "available tutor",
    "can you suggest", "can you recommend", "help me find",
]

# Subject keyword mapping to normalized search terms
SUBJECT_KEYWORDS = {
    "math": "Mathematics",
    "maths": "Mathematics",
    "mathematics": "Mathematics",
    "calculus": "Mathematics",
    "algebra": "Mathematics",
    "geometry": "Mathematics",
    "trigonometry": "Mathematics",
    "statistics": "Mathematics",
    "physics": "Physics",
    "chemistry": "Chemistry",
    "bio": "Biology",
    "biology": "Biology",
    "science": "Science",
    "computer": "Computer Science",
    "programming": "Computer Science",
    "coding": "Computer Science",
    "python": "Computer Science",
    "java": "Computer Science",
    "cs": "Computer Science",
    "english": "English",
    "grammar": "English",
    "literature": "English",
    "history": "History",
    "geography": "Geography",
    "economics": "Economics",
    "accounts": "Economics",
    "accounting": "Economics",
    "commerce": "Economics",
}


def _detect_tutor_request(message: str) -> Optional[str]:
    """
    Detects if the student is asking for a tutor recommendation.
    Returns the subject keyword to search for, or None if not a tutor request.
    """
    message_lower = message.lower()

    # Check if any tutor-request keyword is in the message
    is_tutor_request = any(kw in message_lower for kw in TUTOR_REQUEST_KEYWORDS)

    if not is_tutor_request:
        return None

    # Try to extract subject from the message
    for keyword, subject in SUBJECT_KEYWORDS.items():
        if keyword in message_lower:
            return subject

    # If no specific subject found but it's a tutor request, return general
    return "General"


def _fetch_recommended_tutors(db: Session, subject: str, limit: int = 3) -> list:
    """
    Fetches the top tutors from the database for the given subject,
    sorted by rating (highest first).
    """
    query = (
        db.query(models.Tutor)
        .join(models.User)
        .filter(
            models.Tutor.status == "Approved",
            models.User.is_suspended == False,
        )
    )

    # Search by subject (case-insensitive substring match)
    if subject and subject != "General":
        query = query.filter(models.Tutor.subject.ilike(f"%{subject}%"))

    # Sort by rating descending, then by experience
    tutors = (
        query
        .order_by(models.Tutor.rating.desc(), models.Tutor.experience.desc())
        .limit(limit)
        .all()
    )

    result = []
    for t in tutors:
        # Compute real-time online status using 45-second heartbeat window
        is_currently_online = bool(
            t.is_online and (
                not t.last_seen or
                (datetime.utcnow() - t.last_seen).total_seconds() < 45
            )
        )
        result.append({
            "id": t.id,
            "name": t.user.name,
            "subject": t.subject,
            "qualification": t.qualification,
            "specialization": t.specialization or "",
            "experience": t.experience,
            "hourly_rate": t.hourly_rate,
            "rating": t.rating,
            "languages": t.languages or "",
            "teaching_mode": t.teaching_mode or "Offline",
            "location_city": t.location_city or "",
            "is_online": is_currently_online,
            "profile_image": t.profile_image or "",
        })

    return result


def _build_tutor_context(tutors: list, subject: str) -> str:
    """
    Builds a formatted string describing recommended tutors,
    to be injected into the AI prompt as context.
    """
    if not tutors:
        return (
            f"No approved tutors found for '{subject}' on TutorNow right now. "
            "Please let the student know and suggest they check back later or try a broader subject."
        )

    lines = [
        f"Here are the top {len(tutors)} recommended tutor(s) on TutorNow for '{subject}':",
        ""
    ]
    for i, t in enumerate(tutors, 1):
        online_status = "🟢 Online now" if t["is_online"] else "⚫ Offline"
        lines.append(f"{i}. **{t['name']}** {online_status}")
        lines.append(f"   - Subjects: {t['subject']}")
        lines.append(f"   - Qualification: {t['qualification']}")
        if t["specialization"]:
            lines.append(f"   - Specialization: {t['specialization']}")
        lines.append(f"   - Experience: {t['experience']} year(s)")
        lines.append(f"   - Rating: {t['rating']:.1f} / 5.0 ⭐")
        lines.append(f"   - Hourly Rate: ₹{t['hourly_rate']:.0f}/hour")
        if t["languages"]:
            lines.append(f"   - Languages: {t['languages']}")
        lines.append(f"   - Teaching Mode: {t['teaching_mode']}")
        if t["location_city"]:
            lines.append(f"   - Location: {t['location_city']}")
        lines.append("")

    lines.append(
        "Please present these tutors to the student in a friendly way, "
        "and encourage them to book a session directly on TutorNow."
    )
    return "\n".join(lines)


def _call_groq(messages: list, subject: str, extra_context: str = "") -> str:
    """
    Calls the Groq API (OpenAI-compatible) with the conversation history.
    Optionally injects extra_context (e.g. tutor recommendations) into the system prompt.
    Returns the AI response text.
    Raises HTTPException on failure.
    """
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please contact the administrator to set up the GROQ_API_KEY."
        )

    # Build system prompt, optionally with tutor context appended
    system_content = f"{SYSTEM_PROMPT}\n\nSubject context: {subject}"
    if extra_context:
        system_content += f"\n\n--- TUTOR RECOMMENDATION DATA ---\n{extra_context}\n--- END TUTOR DATA ---"

    chat_messages = [
        {
            "role": "system",
            "content": system_content
        }
    ]

    # Append conversation history and current user message
    for msg in messages:
        chat_messages.append({
            "role": msg["role"],   # "user" or "assistant"
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


# ── Endpoints ─────────────────────────────────────────────────────────────

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
    - Maintains conversation context using session_id.
    - Automatically detects tutor recommendation requests and injects
      real tutor data from the database into the AI prompt.
    """
    # Validate message
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(request.message.strip()) > 2000:
        raise HTTPException(status_code=400, detail="Message is too long. Please keep it under 2000 characters.")

    subject = request.subject or "General"
    user_message = request.message.strip()

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
    messages.append({"role": "user", "content": user_message})

    # ── Tutor Recommendation Detection ──────────────────────────────────
    extra_context = ""
    detected_subject = _detect_tutor_request(user_message)

    if detected_subject:
        # Use the selected subject from the chat selector if it's more specific
        search_subject = subject if subject != "General" else detected_subject
        tutors = _fetch_recommended_tutors(db, search_subject, limit=3)
        extra_context = _build_tutor_context(tutors, search_subject)

    # Call AI with optional tutor context injected
    ai_reply = _call_groq(messages, subject, extra_context=extra_context)

    # Save student message to DB
    user_msg = models.AIChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=user_message,
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


@router.get("/suggest-tutors")
def suggest_tutors(
    subject: Optional[str] = None,
    limit: int = 3,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Direct endpoint to get tutor recommendations for a subject.
    Returns structured tutor data (used by the frontend to show tutor cards).
    """
    search_subject = subject or "General"
    tutors = _fetch_recommended_tutors(db, search_subject, limit=min(limit, 5))
    return {
        "subject": search_subject,
        "count": len(tutors),
        "tutors": tutors
    }


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
