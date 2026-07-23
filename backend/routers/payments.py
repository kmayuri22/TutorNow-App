import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth
from routers.bookings import create_notification

router = APIRouter(prefix="/api/payments", tags=["Payments"])

JITSI_DOMAIN = "meet.jit.si"


@router.post("", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: schemas.PaymentCreate,
    current_user: models.User = Depends(auth.RoleChecker(["Student"])),
    db: Session = Depends(get_db),
):
    booking = db.query(models.Booking).filter(
        models.Booking.id == payment_data.booking_id,
        models.Booking.student_id == current_user.id,
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found for this user")
    if booking.status != "Accepted":
        raise HTTPException(
            status_code=400,
            detail=f"Booking must be accepted by the tutor before payment. Current status: {booking.status}",
        )
    if booking.payment_status == "Paid":
        raise HTTPException(status_code=400, detail="This booking has already been paid for")

    # Simulate payment processing (always succeeds)
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    receipt_number = f"RCP-{uuid.uuid4().hex[:8].upper()}"

    payment = models.Payment(
        booking_id=booking.id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        transaction_id=transaction_id,
        receipt_number=receipt_number,
        status="Success",
    )
    booking.payment_status = "Paid"

    db.add(payment)
    db.commit()
    db.refresh(payment)

    # ── Auto-generate Jitsi Meet room for VIDEO_CALL bookings ──────────────
    meeting_link = None
    if booking.session_type == "VIDEO_CALL":
        existing_session = db.query(models.VideoSession).filter(
            models.VideoSession.booking_id == booking.id
        ).first()

        if not existing_session:
            meeting_id = f"tutornow-{booking.id}-{uuid.uuid4().hex[:8]}"
            meeting_link = f"https://{JITSI_DOMAIN}/{meeting_id}"

            video_session = models.VideoSession(
                booking_id=booking.id,
                meeting_id=meeting_id,
                meeting_link=meeting_link,
                status="Scheduled",
            )
            db.add(video_session)
            db.commit()
            db.refresh(video_session)
        else:
            meeting_link = existing_session.meeting_link

    # Notify tutor
    tutor_user_id = booking.tutor.user_id
    tutor_msg = (
        f"✅ Payment of ₹{payment_data.amount:.2f} received for booking on "
        f"{booking.booking_date} with {current_user.name}. "
        f"Receipt: {receipt_number}"
    )
    if meeting_link:
        tutor_msg += f" 🎥 Video classroom ready: {meeting_link}"
    await create_notification(db, tutor_user_id, tutor_msg)

    # Notify student
    student_msg = (
        f"💳 Payment of ₹{payment_data.amount:.2f} via {payment_data.payment_method} successful. "
        f"Transaction ID: {transaction_id}. Receipt: {receipt_number}"
    )
    if meeting_link:
        student_msg += f" 🎥 Your video classroom is ready! Join at: {meeting_link}"
    await create_notification(db, current_user.id, student_msg)

    return payment




@router.post("/verify/{booking_id}")
def verify_payment(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(models.Payment).filter(models.Payment.booking_id == booking_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {
        "booking_id": booking_id,
        "payment_status": payment.status,
        "transaction_id": payment.transaction_id,
        "receipt_number": payment.receipt_number,
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "created_at": payment.created_at,
    }


@router.get("/history")
def get_payment_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "Student":
        return db.query(models.Payment).join(models.Booking).filter(
            models.Booking.student_id == current_user.id
        ).order_by(models.Payment.id.desc()).all()

    elif current_user.role == "Tutor":
        tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        return db.query(models.Payment).join(models.Booking).filter(
            models.Booking.tutor_id == tutor.id
        ).order_by(models.Payment.id.desc()).all()

    elif current_user.role == "Admin":
        return db.query(models.Payment).order_by(models.Payment.id.desc()).all()

    return []
