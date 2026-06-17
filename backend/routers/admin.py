from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from database import get_db
import models
import schemas
import auth
from routers.bookings import create_notification

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(auth.RoleChecker(["Admin"]))])

@router.get("/analytics", response_model=schemas.DashboardAnalytics)
def get_admin_analytics(db: Session = Depends(get_db)):
    # 1. Total counts
    total_students = db.query(models.User).filter(models.User.role == "Student").count()
    total_tutors = db.query(models.User).filter(models.User.role == "Tutor").count()
    total_bookings = db.query(models.Booking).count()
    
    # 2. Total payments (sum of payments with status Success)
    total_payments_query = db.query(func.sum(models.Payment.amount)).filter(models.Payment.status == "Success").scalar()
    total_payments = float(total_payments_query) if total_payments_query is not None else 0.0

    # 3. Bookings by status
    pending_bookings = db.query(models.Booking).filter(models.Booking.status == "Pending").count()
    completed_bookings = db.query(models.Booking).filter(models.Booking.status == "Accepted").count() # accepted count acts as completed/active here

    # 4. Popular subjects (bookings grouped by tutor subject)
    subject_counts = db.query(
        models.Tutor.subject,
        func.count(models.Booking.id).label("count")
    ).join(models.Booking, models.Booking.tutor_id == models.Tutor.id).group_by(models.Tutor.subject).all()

    popular_subjects = [{"subject": row[0], "count": row[1]} for row in subject_counts]
    if not popular_subjects:
        popular_subjects = [{"subject": "General", "count": 0}]

    # 5. Recent bookings (limit to 5)
    recent_bookings = db.query(models.Booking).order_by(models.Booking.id.desc()).limit(5).all()

    return {
        "total_students": total_students,
        "total_tutors": total_tutors,
        "total_bookings": total_bookings,
        "total_payments": total_payments,
        "pending_bookings": pending_bookings,
        "completed_bookings": completed_bookings,
        "popular_subjects": popular_subjects,
        "recent_bookings": recent_bookings
    }

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    # Format user responses
    results = []
    for u in users:
        user_data = {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at
        }
        if u.role == "Tutor" and u.tutor_profile:
            user_data["tutor_details"] = {
                "id": u.tutor_profile.id,
                "subject": u.tutor_profile.subject,
                "hourly_rate": u.tutor_profile.hourly_rate,
                "is_verified": u.tutor_profile.is_verified,
                "rating": u.tutor_profile.rating
            }
        results.append(user_data)
    return results

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "User and associated data deleted successfully"}

@router.put("/tutors/{tutor_id}/verify")
async def verify_tutor(tutor_id: int, is_verified: bool, db: Session = Depends(get_db)):
    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    tutor.is_verified = is_verified
    db.commit()

    # Notify tutor
    status_text = "Verified" if is_verified else "Unverified/Suspended"
    tutor_msg = f"Your tutor profile verification status has been updated to: {status_text}."
    await create_notification(db, tutor.user_id, tutor_msg)

    return {
        "message": f"Tutor verification status updated to {is_verified}",
        "tutor_id": tutor_id,
        "is_verified": is_verified
    }

@router.get("/reports")
def get_reports(db: Session = Depends(get_db)):
    # Aggregated platform health report
    total_revenue = db.query(func.sum(models.Payment.amount)).filter(models.Payment.status == "Success").scalar() or 0.0
    bookings_count = db.query(models.Booking.status, func.count(models.Booking.id)).group_by(models.Booking.status).all()
    bookings_breakdown = {status_name: count for status_name, count in bookings_count}

    payments_method_count = db.query(models.Payment.payment_method, func.count(models.Payment.id)).group_by(models.Payment.payment_method).all()
    payments_breakdown = {method: count for method, count in payments_method_count}

    # Revenue by subject
    revenue_by_subject = db.query(
        models.Tutor.subject,
        func.sum(models.Payment.amount)
    ).join(models.Booking, models.Booking.tutor_id == models.Tutor.id)\
     .join(models.Payment, models.Payment.booking_id == models.Booking.id)\
     .filter(models.Payment.status == "Success")\
     .group_by(models.Tutor.subject).all()
     
    revenue_subject_breakdown = [{"subject": row[0], "revenue": float(row[1])} for row in revenue_by_subject]

    return {
        "total_revenue": float(total_revenue),
        "bookings_breakdown": bookings_breakdown,
        "payments_breakdown": payments_breakdown,
        "revenue_by_subject": revenue_subject_breakdown
    }
