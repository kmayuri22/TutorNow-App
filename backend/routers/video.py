import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
from websocket import manager

router = APIRouter(prefix="/api/video", tags=["Video Sessions"])

JITSI_DOMAIN = "meet.jit.si"


async def _notify(db: Session, user_id: int, message: str):
    notif = models.Notification(user_id=user_id, message=message, status="Unread")
    db.add(notif)
    db.commit()
    db.refresh(notif)
    await manager.send_personal_message({
        "type": "notification",
        "id": notif.id,
        "message": notif.message,
        "status": notif.status,
        "created_at": str(notif.created_at)
    }, user_id)


def _get_video_booking(booking_id: int, db: Session) -> models.Booking:
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.session_type != "VIDEO_CALL":
        raise HTTPException(status_code=400, detail="This booking is not a video call session")
    return booking


@router.post("/{booking_id}/create", response_model=schemas.VideoSessionResponse)
async def create_video_session(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor creates the Jitsi meeting room for an accepted video booking."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.tutor_id == tutor.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.session_type != "VIDEO_CALL":
        raise HTTPException(status_code=400, detail="Not a video call booking")
    if booking.status != "Accepted":
        raise HTTPException(status_code=400, detail="Booking must be Accepted first")

    # Check if session already exists
    existing = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if existing:
        return existing

    # Generate unique Jitsi room name
    meeting_id = f"tutornow-{booking_id}-{uuid.uuid4().hex[:8]}"
    meeting_link = f"https://{JITSI_DOMAIN}/{meeting_id}"

    session = models.VideoSession(
        booking_id=booking_id,
        meeting_id=meeting_id,
        meeting_link=meeting_link,
        status="Scheduled"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Notify student with meeting link
    await _notify(
        db,
        booking.student_id,
        f"🎥 Your tutor {current_user.name} has created the video session! "
        f"Meeting link: {meeting_link}"
    )

    # Push video_session_created event via WebSocket
    await manager.send_personal_message({
        "type": "video_session_created",
        "booking_id": booking_id,
        "meeting_id": meeting_id,
        "meeting_link": meeting_link
    }, booking.student_id)

    return session


@router.get("/{booking_id}", response_model=schemas.VideoSessionResponse)
def get_video_session(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get video session details for a booking."""
    session = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Video session not created yet")
    return session


@router.post("/{booking_id}/start", response_model=schemas.VideoSessionResponse)
async def start_video_session(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor marks video session as started."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.tutor_id == tutor.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    session = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found. Create it first.")

    session.status = "Active"
    session.start_time = datetime.datetime.utcnow()
    booking.status = "Completed"  # Mark in progress / active
    db.commit()
    db.refresh(session)

    await _notify(db, booking.student_id,
                  f"📹 Your video session with {current_user.name} is now LIVE! Join now: {session.meeting_link}")

    await manager.send_personal_message({
        "type": "video_session_started",
        "booking_id": booking_id,
        "meeting_link": session.meeting_link,
        "meeting_id": session.meeting_id
    }, booking.student_id)

    return session


@router.post("/{booking_id}/end", response_model=schemas.VideoSessionResponse)
async def end_video_session(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor ends the video session."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.tutor_id == tutor.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    session = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")

    session.status = "Ended"
    session.end_time = datetime.datetime.utcnow()
    db.commit()
    db.refresh(session)

    await _notify(db, booking.student_id,
                  f"🎉 Your session with {current_user.name} has ended. Please leave a review!")

    await manager.send_personal_message({
        "type": "video_session_ended",
        "booking_id": booking_id
    }, booking.student_id)

    return session
