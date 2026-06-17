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
    current_user: models.User = Depends(auth.RoleChecker(["Student"])),
    db: Session = Depends(get_db)
):
    # Retrieve booking
    booking = db.query(models.Booking).filter(
        models.Booking.id == payment_data.booking_id,
        models.Booking.student_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found for this user")

    if booking.status != "Accepted":
        raise HTTPException(
            status_code=400, 
            detail=f"Booking must be accepted by the tutor before payment. Current status: {booking.status}"
        )

    if booking.payment_status == "Paid":
        raise HTTPException(status_code=400, detail="This booking has already been paid for")

    # Perform mock processing (always succeeds in this sandbox)
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    
    # Create the payment log
    payment = models.Payment(
        booking_id=booking.id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        transaction_id=transaction_id,
        status="Success"
    )
    
    # Update Booking
    booking.payment_status = "Paid"
    
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Notify Tutor
    tutor_user_id = booking.tutor.user_id
    tutor_msg = f"Payment of ${payment_data.amount:.2f} received for booking on {booking.booking_date} with {current_user.name}."
    await create_notification(db, tutor_user_id, tutor_msg)

    return payment

@router.post("/verify/{booking_id}")
def verify_payment(
    booking_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(models.Payment).filter(models.Payment.booking_id == booking_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    return {
        "booking_id": booking_id,
        "payment_status": payment.status,
        "transaction_id": payment.transaction_id,
        "amount": payment.amount
    }

@router.get("/history")
def get_payment_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "Student":
        # Payments made by this student
        return db.query(models.Payment).join(models.Booking).filter(
            models.Booking.student_id == current_user.id
        ).order_by(models.Payment.id.desc()).all()

    elif current_user.role == "Tutor":
        # Payments received by this tutor
        tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        return db.query(models.Payment).join(models.Booking).filter(
            models.Booking.tutor_id == tutor.id
        ).order_by(models.Payment.id.desc()).all()

    elif current_user.role == "Admin":
        # All payments on platform
        return db.query(models.Payment).order_by(models.Payment.id.desc()).all()

    return []
