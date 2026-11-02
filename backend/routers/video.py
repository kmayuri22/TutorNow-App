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


@router.post("/{booking_id}/create", response_model=schemas.VideoSessionResponse)
async def create_video_session(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor creates the video session room for an accepted video booking."""
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

    # Check if session already exists
    existing = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if existing:
        return existing

    # Generate native classroom link
    meeting_id = f"tutornow-{booking_id}-{uuid.uuid4().hex}"
    meeting_link = f"/student/session/{booking_id}"

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
    try:
        await _notify(
            db,
            booking.student_id,
            f"🎥 Your tutor {current_user.name} has started the video session! "
            f"Join Native Classroom: {meeting_link}"
        )

        # Push video_session_created event via WebSocket
        await manager.send_personal_message({
            "type": "video_session_created",
            "booking_id": booking_id,
            "meeting_id": meeting_id,
            "meeting_link": meeting_link
        }, booking.student_id)
    except Exception as e:
        print(f"[VIDEO NOTIFICATION WARN]: {e}")

    return session


@router.get("/{booking_id}", response_model=schemas.VideoSessionResponse)
def get_video_session(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get video session details for a booking, auto-generating room if needed."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Authorize: user must be student, tutor for this booking, or admin
    if current_user.role == "Student" and booking.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    elif current_user.role == "Tutor":
        t = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if not t or booking.tutor_id != t.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    session = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if not session:
        # Auto-create video session if booking is a video call
        if booking.session_type == "VIDEO_CALL":
            meeting_id = f"tutornow-{booking_id}-{uuid.uuid4().hex}"
            meeting_link = f"/student/session/{booking_id}"
            session = models.VideoSession(
                booking_id=booking_id,
                meeting_id=meeting_id,
                meeting_link=meeting_link,
                status="Scheduled"
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        else:
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
    session.meeting_link = f"/student/session/{booking_id}"
    session.start_time = datetime.datetime.utcnow()
    booking.status = "Completed"  # Mark in progress / active
    db.commit()
    db.refresh(session)

    await _notify(db, booking.student_id,
                  f"📹 Your video classroom with {current_user.name} is now LIVE! Join in dashboard: {session.meeting_link}")

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
    current_user: models.User = Depends(auth.RoleChecker(["Tutor", "Student", "Admin"])),
    db: Session = Depends(get_db)
):
    """End the video session and update booking status."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    session = db.query(models.VideoSession).filter(models.VideoSession.booking_id == booking_id).first()
    if not session:
        # Create completed session entry if not created earlier
        session = models.VideoSession(
            booking_id=booking_id,
            meeting_id=f"tutornow-{booking_id}",
            meeting_link=f"/student/session/{booking_id}",
            status="Ended"
        )
        db.add(session)

    session.status = "Ended"
    session.end_time = datetime.datetime.utcnow()
    booking.status = "Completed"
    booking.tracking_status = "Session Completed"
    db.commit()
    db.refresh(session)
    db.refresh(booking)

    # Push to Supabase if connected
    try:
        from supabase_sync import sync_push_row
        sync_push_row("bookings", {
            "id": booking.id,
            "status": "Completed",
            "tracking_status": "Session Completed"
        })
    except Exception:
        pass

    # Broadcast event to video room so connected participants immediately handle call ended
    try:
        await manager.broadcast_video(booking_id, {
            "type": "call_ended",
            "role": current_user.role,
            "sender": current_user.name
        })
    except Exception as e:
        print(f"[VIDEO WS END WARN]: {e}")

    # Notify student
    try:
        tutor_user = booking.tutor.user if booking.tutor else None
        tutor_name = tutor_user.name if tutor_user else "your tutor"
        await _notify(
            db,
            booking.student_id,
            f"🎉 Your video session with {tutor_name} has concluded! Please leave a review."
        )
        await manager.send_personal_message({
            "type": "video_session_ended",
            "booking_id": booking_id
        }, booking.student_id)
    except Exception as e:
        print(f"[VIDEO NOTIFY WARN]: {e}")

    return session
