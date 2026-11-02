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

@router.post("", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: schemas.PaymentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(models.Booking).filter(
        models.Booking.id == payment_data.booking_id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    existing_payment = db.query(models.Payment).filter(models.Payment.booking_id == booking.id).first()
    if existing_payment:
        booking.payment_status = "Paid"
        if booking.status == "Pending":
            booking.status = "Accepted"
        db.commit()
        return existing_payment

    # Determine amount safely
    effective_amount = payment_data.amount
    if not effective_amount or effective_amount <= 0:
        if booking.tutor and booking.tutor.hourly_rate and booking.tutor.hourly_rate > 0:
            effective_amount = float(booking.tutor.hourly_rate)
        else:
            effective_amount = 500.0

    # Simulate payment processing (always succeeds)
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    receipt_number = f"RCP-{uuid.uuid4().hex[:8].upper()}"

    payment = models.Payment(
        booking_id=booking.id,
        amount=effective_amount,
        payment_method=payment_data.payment_method or "UPI",
        transaction_id=transaction_id,
        receipt_number=receipt_number,
        status="Success",
    )
    booking.payment_status = "Paid"
    if booking.status == "Pending":
        booking.status = "Accepted"

    db.add(payment)
    db.commit()
    db.refresh(payment)

    # ── Auto-generate Video Session room for VIDEO_CALL bookings ──────────
    meeting_link = f"/student/session/{booking.id}"
    if booking.session_type == "VIDEO_CALL":
        existing_session = db.query(models.VideoSession).filter(
            models.VideoSession.booking_id == booking.id
        ).first()

        if not existing_session:
            meeting_id = f"tutornow-{booking.id}-{uuid.uuid4().hex}"
            video_session = models.VideoSession(
                booking_id=booking.id,
                meeting_id=meeting_id,
                meeting_link=meeting_link,
                status="Scheduled",
            )
            db.add(video_session)
            db.commit()

    # Notify tutor safely
    try:
        if booking.tutor and booking.tutor.user_id:
            tutor_user_id = booking.tutor.user_id
            tutor_msg = (
                f"✅ Payment of ₹{effective_amount:.2f} received for booking on "
                f"{booking.booking_date} with {current_user.name}. "
                f"Receipt: {receipt_number}"
            )
            await create_notification(db, tutor_user_id, tutor_msg, {
                "event_type": "PAYMENT_SUCCESS",
                "booking_id": booking.id,
                "payment_status": "Paid",
                "status": booking.status
            })
    except Exception as e:
        print(f"[PAYMENT NOTIFICATION TUTOR ERROR]: {e}")

    # Notify student safely
    try:
        student_msg = (
            f"💳 Payment of ₹{effective_amount:.2f} via {payment_data.payment_method} successful. "
            f"Transaction ID: {transaction_id}. Receipt: {receipt_number}"
        )
        await create_notification(db, current_user.id, student_msg, {
            "event_type": "PAYMENT_SUCCESS",
            "booking_id": booking.id,
            "payment_status": "Paid",
            "status": booking.status
        })
    except Exception as e:
        print(f"[PAYMENT NOTIFICATION STUDENT ERROR]: {e}")

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
            return []
        return db.query(models.Payment).join(models.Booking).filter(
            models.Booking.tutor_id == tutor.id
        ).order_by(models.Payment.id.desc()).all()

    elif current_user.role == "Admin":
        return db.query(models.Payment).order_by(models.Payment.id.desc()).all()

    return []
