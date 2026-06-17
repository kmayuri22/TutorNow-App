from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models
import schemas
import auth
from websocket import manager

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])

async def create_notification(db: Session, user_id: int, message: str):
    # Create notification record in database
    notif = models.Notification(
        user_id=user_id,
        message=message,
        status="Unread"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push in real-time if online
    await manager.send_personal_message({
        "type": "notification",
        "id": notif.id,
        "message": notif.message,
        "status": notif.status,
        "created_at": str(notif.created_at)
    }, user_id)

@router.post("", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: schemas.BookingCreate,
    current_user: models.User = Depends(auth.RoleChecker(["Student"])),
    db: Session = Depends(get_db)
):
    # Check if tutor exists
    tutor = db.query(models.Tutor).filter(models.Tutor.id == booking_data.tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Find the availability slot that matches the date and session time
    # The session_time is stored like "10:00:00 - 11:00:00"
    times = booking_data.session_time.split(" - ")
    if len(times) != 2:
        raise HTTPException(status_code=400, detail="Invalid session time format. Must be 'HH:MM - HH:MM'")

    try:
        start_time = datetime.strptime(times[0].strip(), "%H:%M").time()
        end_time = datetime.strptime(times[1].strip(), "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session time characters. Use HH:MM format.")

    # Find slot
    slot = db.query(models.Availability).filter(
        models.Availability.tutor_id == tutor.id,
        models.Availability.date == booking_data.booking_date,
        models.Availability.start_time == start_time,
        models.Availability.end_time == end_time,
        models.Availability.status == "Available"
    ).first()

    if not slot:
        raise HTTPException(status_code=400, detail="Requested availability slot is not available or does not exist")

    # Mark slot as reserved/booked to avoid race conditions
    slot.status = "Booked"
    
    # Create the Booking
    new_booking = models.Booking(
        student_id=current_user.id,
        tutor_id=tutor.id,
        booking_date=booking_data.booking_date,
        session_time=booking_data.session_time,
        status="Pending",
        payment_status="Unpaid",
        session_type=booking_data.session_type,
        student_lat=booking_data.student_lat,
        student_lng=booking_data.student_lng,
        tutor_lat=booking_data.tutor_lat,
        tutor_lng=booking_data.tutor_lng,
        student_address=booking_data.student_address,
        tutor_address=booking_data.tutor_address
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Notify Tutor
    tutor_user_id = tutor.user_id
    tutor_message = f"New booking request received from {current_user.name} for {booking_data.booking_date} at {booking_data.session_time}."
    await create_notification(db, tutor_user_id, tutor_message)

    return new_booking

@router.get("", response_model=List[schemas.BookingDetailResponse])
def get_bookings(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Student":
        return db.query(models.Booking).filter(
            models.Booking.student_id == current_user.id
        ).order_by(models.Booking.booking_date.desc()).all()
        
    elif current_user.role == "Tutor":
        tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        return db.query(models.Booking).filter(
            models.Booking.tutor_id == tutor.id
        ).order_by(models.Booking.booking_date.desc()).all()
        
    elif current_user.role == "Admin":
        return db.query(models.Booking).order_by(models.Booking.booking_date.desc()).all()
        
    return []

@router.put("/{booking_id}/accept", response_model=schemas.BookingResponse)
async def accept_booking(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.tutor_id == tutor.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found")

    if booking.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot accept booking in '{booking.status}' status")

    booking.status = "Accepted"
    db.commit()
    db.refresh(booking)

    # Notify student
    student_message = f"Your booking request with Tutor {current_user.name} has been Accepted. Please proceed to payment."
    await create_notification(db, booking.student_id, student_message)

    return booking

@router.put("/{booking_id}/reject", response_model=schemas.BookingResponse)
async def reject_booking(
    booking_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.tutor_id == tutor.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found")

    if booking.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject booking in '{booking.status}' status")

    booking.status = "Rejected"
    
    # Release availability slot
    times = booking.session_time.split(" - ")
    if len(times) == 2:
        start_time = datetime.strptime(times[0].strip(), "%H:%M").time()
        end_time = datetime.strptime(times[1].strip(), "%H:%M").time()
        slot = db.query(models.Availability).filter(
            models.Availability.tutor_id == tutor.id,
            models.Availability.date == booking.booking_date,
            models.Availability.start_time == start_time,
            models.Availability.end_time == end_time
        ).first()
        if slot:
            slot.status = "Available"

    db.commit()
    db.refresh(booking)

    # Notify student
    student_message = f"Your booking request with Tutor {current_user.name} was rejected."
    await create_notification(db, booking.student_id, student_message)

    return booking

@router.put("/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Authorize: Student who booked, or Tutor who belongs to this booking
    is_authorized = False
    notify_user_id = None
    notif_msg = ""

    if current_user.role == "Student" and booking.student_id == current_user.id:
        is_authorized = True
        notify_user_id = booking.tutor.user_id
        notif_msg = f"Student {current_user.name} has cancelled their booking for {booking.booking_date} at {booking.session_time}."
    elif current_user.role == "Tutor":
        tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if tutor and booking.tutor_id == tutor.id:
            is_authorized = True
            notify_user_id = booking.student_id
            notif_msg = f"Tutor {current_user.name} has cancelled your booking for {booking.booking_date} at {booking.session_time}."

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status in ["Cancelled", "Rejected"]:
        raise HTTPException(status_code=400, detail="Booking is already cancelled or rejected")

    # Release availability slot
    times = booking.session_time.split(" - ")
    if len(times) == 2:
        start_time = datetime.strptime(times[0].strip(), "%H:%M").time()
        end_time = datetime.strptime(times[1].strip(), "%H:%M").time()
        slot = db.query(models.Availability).filter(
            models.Availability.tutor_id == booking.tutor_id,
            models.Availability.date == booking.booking_date,
            models.Availability.start_time == start_time,
            models.Availability.end_time == end_time
        ).first()
        if slot:
            slot.status = "Available"

    booking.status = "Cancelled"
    db.commit()
    db.refresh(booking)

    # Push Notification
    if notify_user_id:
        await create_notification(db, notify_user_id, notif_msg)

    return booking


@router.get("/{booking_id}", response_model=schemas.BookingDetailResponse)
def get_booking_detail(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Check authorization
    if current_user.role == "Student" and booking.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    elif current_user.role == "Tutor":
        tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if not tutor or booking.tutor_id != tutor.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this booking")
            
    return booking
