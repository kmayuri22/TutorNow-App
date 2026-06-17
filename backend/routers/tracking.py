import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
from websocket import manager

router = APIRouter(prefix="/api/tracking", tags=["Live Tracking"])


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


def _get_tutor_booking(booking_id: int, tutor: models.Tutor, db: Session) -> models.Booking:
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.tutor_id == tutor.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.session_type != "IN_PERSON":
        raise HTTPException(status_code=400, detail="This booking is not an in-person session")
    return booking


@router.post("/{booking_id}/start-journey", response_model=schemas.LiveTrackingResponse)
async def start_journey(
    booking_id: int,
    location: schemas.LiveTrackingEvent,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor starts journey — changes tracking status and broadcasts first location."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = _get_tutor_booking(booking_id, tutor, db)
    if booking.status != "Accepted":
        raise HTTPException(status_code=400, detail="Booking must be Accepted before journey can start")

    # Update tracking status on booking
    booking.tracking_status = "Journey Started"
    db.commit()

    # Update tutor's stored location
    tutor_loc = db.query(models.TutorLocation).filter(models.TutorLocation.tutor_id == tutor.id).first()
    if tutor_loc:
        tutor_loc.latitude = location.latitude
        tutor_loc.longitude = location.longitude
        tutor_loc.updated_at = datetime.datetime.utcnow()
    else:
        tutor_loc = models.TutorLocation(
            tutor_id=tutor.id,
            latitude=location.latitude,
            longitude=location.longitude
        )
        db.add(tutor_loc)

    # Record tracking event
    event = models.LiveTracking(
        booking_id=booking_id,
        latitude=location.latitude,
        longitude=location.longitude,
        status="Journey Started"
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Broadcast to all watchers of this booking (student's browser)
    payload = {
        "type": "tracking_update",
        "booking_id": booking_id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "status": "Journey Started",
        "timestamp": str(event.timestamp)
    }
    await manager.broadcast_tracking(booking_id, payload)
    await manager.send_personal_message(payload, booking.student_id)

    # Notify student
    await _notify(db, booking.student_id,
                  f"Your tutor {current_user.name} has started the journey to your location!")

    return event


@router.post("/{booking_id}/update-location", response_model=schemas.LiveTrackingResponse)
async def update_location(
    booking_id: int,
    location: schemas.LiveTrackingEvent,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor sends a GPS update during journey — broadcast to student in real time."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = _get_tutor_booking(booking_id, tutor, db)

    # Upsert tutor location
    tutor_loc = db.query(models.TutorLocation).filter(models.TutorLocation.tutor_id == tutor.id).first()
    if tutor_loc:
        tutor_loc.latitude = location.latitude
        tutor_loc.longitude = location.longitude
        tutor_loc.updated_at = datetime.datetime.utcnow()
    else:
        tutor_loc = models.TutorLocation(tutor_id=tutor.id, latitude=location.latitude, longitude=location.longitude)
        db.add(tutor_loc)

    # Record tracking event
    event = models.LiveTracking(
        booking_id=booking_id,
        latitude=location.latitude,
        longitude=location.longitude,
        status=location.status
    )
    db.add(event)

    # Update booking tracking_status if changed
    if booking.tracking_status != location.status:
        booking.tracking_status = location.status
    db.commit()
    db.refresh(event)

    payload = {
        "type": "tracking_update",
        "booking_id": booking_id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "status": location.status,
        "timestamp": str(event.timestamp)
    }
    await manager.broadcast_tracking(booking_id, payload)
    await manager.send_personal_message(payload, booking.student_id)

    # Special notifications for key status changes
    if location.status == "Tutor Nearby":
        await _notify(db, booking.student_id,
                      f"🚗 Your tutor {current_user.name} is nearby! Be ready.")
    elif location.status == "Tutor Arrived":
        await _notify(db, booking.student_id,
                      f"✅ Your tutor {current_user.name} has arrived!")

    return event


@router.post("/{booking_id}/mark-arrived")
async def mark_arrived(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor marks they have arrived at student location."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = _get_tutor_booking(booking_id, tutor, db)
    booking.tracking_status = "Tutor Arrived"
    db.commit()

    payload = {
        "type": "tracking_update",
        "booking_id": booking_id,
        "status": "Tutor Arrived",
        "latitude": None, "longitude": None,
        "timestamp": str(datetime.datetime.utcnow())
    }
    await manager.broadcast_tracking(booking_id, payload)
    await _notify(db, booking.student_id,
                  f"✅ Tutor {current_user.name} has arrived at your location!")
    return {"message": "Marked as arrived", "tracking_status": "Tutor Arrived"}


@router.post("/{booking_id}/start-session")
async def start_session(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor starts the tutoring session."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = _get_tutor_booking(booking_id, tutor, db)
    booking.tracking_status = "Session Started"
    db.commit()

    payload = {
        "type": "tracking_update",
        "booking_id": booking_id,
        "status": "Session Started",
        "latitude": None, "longitude": None,
        "timestamp": str(datetime.datetime.utcnow())
    }
    await manager.broadcast_tracking(booking_id, payload)
    await _notify(db, booking.student_id, f"📚 Your tutoring session with {current_user.name} has started!")
    return {"message": "Session started", "tracking_status": "Session Started"}


@router.post("/{booking_id}/end-session")
async def end_session(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    """Tutor ends the session and marks booking Completed."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = _get_tutor_booking(booking_id, tutor, db)
    booking.tracking_status = "Session Completed"
    booking.status = "Completed"
    db.commit()

    payload = {
        "type": "tracking_update",
        "booking_id": booking_id,
        "status": "Session Completed",
        "latitude": None, "longitude": None,
        "timestamp": str(datetime.datetime.utcnow())
    }
    await manager.broadcast_tracking(booking_id, payload)
    await _notify(db, booking.student_id,
                  f"🎉 Your session with {current_user.name} is complete. Please leave a review!")
    return {"message": "Session completed", "tracking_status": "Session Completed"}


@router.get("/{booking_id}", response_model=schemas.LiveTrackingResponse)
def get_latest_tracking(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the most recent tracking event for a booking (for polling fallback)."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    event = db.query(models.LiveTracking).filter(
        models.LiveTracking.booking_id == booking_id
    ).order_by(models.LiveTracking.timestamp.desc()).first()

    if not event:
        raise HTTPException(status_code=404, detail="No tracking data yet")
    return event


@router.get("/{booking_id}/tutor-location", response_model=schemas.TutorLocationResponse)
def get_tutor_location(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a tutor's current stored location for a specific booking."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    loc = db.query(models.TutorLocation).filter(
        models.TutorLocation.tutor_id == booking.tutor_id
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Tutor location not yet available")
    return loc
