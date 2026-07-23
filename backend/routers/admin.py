import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Optional
from database import get_db
import models
import schemas
import auth
from routers.bookings import create_notification

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(auth.RoleChecker(["Admin"]))])


# ─────────────────────────────────────────────
# Dashboard Analytics
# ─────────────────────────────────────────────

@router.get("/analytics", response_model=schemas.DashboardAnalytics)
def get_admin_analytics(db: Session = Depends(get_db)):
    total_students = db.query(models.User).filter(models.User.role == "Student").count()
    total_tutors = db.query(models.User).filter(models.User.role == "Tutor").count()
    total_bookings = db.query(models.Booking).count()

    pending_tutors = db.query(models.Tutor).filter(models.Tutor.status == "Pending").count()
    approved_tutors = db.query(models.Tutor).filter(models.Tutor.status == "Approved").count()

    total_payments_query = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.status == "Success"
    ).scalar()
    total_payments = float(total_payments_query) if total_payments_query is not None else 0.0

    pending_bookings = db.query(models.Booking).filter(models.Booking.status == "Pending").count()
    completed_bookings = db.query(models.Booking).filter(models.Booking.status == "Accepted").count()

    subject_counts = db.query(
        models.Tutor.subject,
        func.count(models.Booking.id).label("count")
    ).join(models.Booking, models.Booking.tutor_id == models.Tutor.id).group_by(models.Tutor.subject).all()

    popular_subjects = [{"subject": row[0], "count": row[1]} for row in subject_counts]
    if not popular_subjects:
        popular_subjects = [{"subject": "N/A", "count": 0}]

    recent_bookings = db.query(models.Booking).order_by(models.Booking.id.desc()).limit(5).all()

    return {
        "total_students": total_students,
        "total_tutors": total_tutors,
        "pending_tutors": pending_tutors,
        "approved_tutors": approved_tutors,
        "total_bookings": total_bookings,
        "total_payments": total_payments,
        "pending_bookings": pending_bookings,
        "completed_bookings": completed_bookings,
        "popular_subjects": popular_subjects,
        "recent_bookings": recent_bookings,
    }


# ─────────────────────────────────────────────
# User Management
# ─────────────────────────────────────────────

@router.get("/users")
def list_users(role: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    users = query.all()
    results = []
    for u in users:
        user_data = {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "mobile": u.mobile,
            "role": u.role,
            "is_suspended": u.is_suspended,
            "created_at": u.created_at,
        }
        if u.role == "Tutor" and u.tutor_profile:
            tp = u.tutor_profile
            docs = db.query(models.TutorDocument).filter(
                models.TutorDocument.tutor_id == tp.id
            ).all()
            user_data["tutor_details"] = {
                "id": tp.id,
                "subject": tp.subject,
                "qualification": tp.qualification,
                "specialization": tp.specialization,
                "experience": tp.experience,
                "hourly_rate": tp.hourly_rate,
                "rating": tp.rating,
                "languages": tp.languages,
                "teaching_mode": tp.teaching_mode,
                "location_city": tp.location_city,
                "profile_image": tp.profile_image,
                "is_verified": tp.is_verified,
                "status": tp.status,
                "rejection_reason": tp.rejection_reason,
                "approved_at": tp.approved_at,
                "documents": [
                    {
                        "id": d.id,
                        "file_name": d.file_name,
                        "file_path": d.file_path,
                        "file_type": d.file_type,
                        "doc_label": d.doc_label,
                        "uploaded_at": d.uploaded_at,
                    }
                    for d in docs
                ],
            }
        results.append(user_data)
    return results


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "Admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    db.delete(user)
    db.commit()
    return {"message": "User and all associated data deleted successfully"}


@router.put("/users/{user_id}/suspend")
async def suspend_user(user_id: int, suspend: bool = True, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "Admin":
        raise HTTPException(status_code=400, detail="Cannot suspend admin accounts")

    user.is_suspended = suspend
    db.commit()

    action = "suspended" if suspend else "unsuspended"
    await create_notification(
        db, user.id,
        f"Your account has been {action} by the admin. {'Contact support for more information.' if suspend else 'You can log in again.'}"
    )
    return {"message": f"User {action} successfully", "user_id": user_id, "is_suspended": suspend}


# ─────────────────────────────────────────────
# Tutor Approval Workflow
# ─────────────────────────────────────────────

@router.get("/tutors/pending")
def get_pending_tutors(db: Session = Depends(get_db)):
    """Return all tutors awaiting admin review."""
    tutors = db.query(models.Tutor).filter(models.Tutor.status == "Pending").all()
    results = []
    for t in tutors:
        docs = db.query(models.TutorDocument).filter(
            models.TutorDocument.tutor_id == t.id
        ).all()
        results.append({
            "id": t.id,
            "user_id": t.user_id,
            "name": t.user.name,
            "email": t.user.email,
            "mobile": t.user.mobile,
            "qualification": t.qualification,
            "specialization": t.specialization,
            "subject": t.subject,
            "experience": t.experience,
            "hourly_rate": t.hourly_rate,
            "languages": t.languages,
            "teaching_mode": t.teaching_mode,
            "location_city": t.location_city,
            "bio": t.bio,
            "profile_image": t.profile_image,
            "status": t.status,
            "registered_at": t.user.created_at,
            "documents": [
                {
                    "id": d.id,
                    "file_name": d.file_name,
                    "file_path": d.file_path,
                    "file_type": d.file_type,
                    "doc_label": d.doc_label,
                    "uploaded_at": d.uploaded_at,
                }
                for d in docs
            ],
        })
    return results


@router.put("/tutors/{tutor_id}/action")
async def tutor_approval_action(
    tutor_id: int,
    action_data: schemas.TutorApprovalAction,
    db: Session = Depends(get_db),
):
    """Approve, reject, or request changes for a tutor application."""
    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    action = action_data.action.lower()

    if action == "approve":
        tutor.status = "Approved"
        tutor.is_verified = True
        tutor.rejection_reason = None
        tutor.approved_at = datetime.datetime.utcnow()
        msg = (
            "🎉 Congratulations! Your tutor profile has been approved. "
            "You can now log in and access your Tutor Dashboard."
        )
    elif action == "reject":
        tutor.status = "Rejected"
        tutor.is_verified = False
        tutor.rejection_reason = action_data.reason or "Application did not meet requirements."
        msg = (
            f"❌ Your tutor application has been rejected. "
            f"Reason: {tutor.rejection_reason}"
        )
    elif action == "request_changes":
        tutor.status = "Pending"
        tutor.rejection_reason = action_data.reason or "Please update your profile and resubmit."
        msg = (
            f"📝 Admin has requested changes to your tutor profile. "
            f"Feedback: {tutor.rejection_reason}"
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use: approve, reject, request_changes")

    db.commit()
    await create_notification(db, tutor.user_id, msg)

    return {
        "message": f"Tutor status updated to '{tutor.status}'",
        "tutor_id": tutor_id,
        "status": tutor.status,
    }


@router.put("/tutors/{tutor_id}/verify")
async def verify_tutor(tutor_id: int, is_verified: bool, db: Session = Depends(get_db)):
    """Legacy compatibility endpoint for quick verify toggle."""
    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    tutor.is_verified = is_verified
    tutor.status = "Approved" if is_verified else "Pending"
    if is_verified:
        tutor.approved_at = datetime.datetime.utcnow()
    db.commit()

    status_text = "Approved" if is_verified else "Pending"
    await create_notification(
        db, tutor.user_id,
        f"Your tutor profile status has been updated to: {status_text}."
    )
    return {"message": f"Tutor status updated to {status_text}", "tutor_id": tutor_id}


# ─────────────────────────────────────────────
# Booking & Payment Management
# ─────────────────────────────────────────────

@router.get("/bookings")
def get_all_bookings(db: Session = Depends(get_db)):
    """Admin: all bookings on the platform."""
    bookings = db.query(models.Booking).order_by(models.Booking.id.desc()).all()
    results = []
    for b in bookings:
        results.append({
            "id": b.id,
            "student_name": b.student.name if b.student else "—",
            "tutor_name": b.tutor.user.name if b.tutor and b.tutor.user else "—",
            "booking_date": str(b.booking_date) if b.booking_date else None,
            "session_time": b.session_time,
            "session_type": b.session_type,
            "status": b.status,
            "payment_status": b.payment_status,
            "subject": b.subject or (b.tutor.subject if b.tutor else ""),
            "amount": b.payment.amount if b.payment else None,
            "created_at": b.created_at,
        })
    return results


@router.get("/payments")
def get_all_payments(db: Session = Depends(get_db)):
    """Admin: all payments on the platform."""
    payments = db.query(models.Payment).order_by(models.Payment.id.desc()).all()
    results = []
    for p in payments:
        booking = p.booking
        results.append({
            "id": p.id,
            "receipt_number": p.receipt_number,
            "booking_id": p.booking_id,
            "amount": p.amount,
            "payment_method": p.payment_method,
            "transaction_id": p.transaction_id,
            "status": p.status,
            "created_at": p.created_at,
            "student_name": booking.student.name if booking and booking.student else "—",
            "tutor_name": booking.tutor.user.name if booking and booking.tutor else "—",
        })
    return results


# ─────────────────────────────────────────────
# Login History
# ─────────────────────────────────────────────

@router.get("/login-history")
def get_login_history(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """Admin: full login/logout audit log."""
    query = db.query(models.LoginHistory).order_by(models.LoginHistory.login_time.desc())
    if role:
        query = query.filter(models.LoginHistory.role == role)
    if status_filter:
        query = query.filter(models.LoginHistory.login_status == status_filter)

    total = query.count()
    records = query.offset(offset).limit(limit).all()

    results = []
    for r in records:
        results.append({
            "id": r.id,
            "user_id": r.user_id,
            "name": r.user.name if r.user else r.email,
            "email": r.email,
            "role": r.role,
            "ip_address": r.ip_address,
            "device_info": r.device_info,
            "login_status": r.login_status,
            "failure_reason": r.failure_reason,
            "login_time": r.login_time,
            "logout_time": r.logout_time,
        })
    return {"total": total, "records": results}


# ─────────────────────────────────────────────
# Reports
# ─────────────────────────────────────────────

@router.get("/reports")
def get_reports(db: Session = Depends(get_db)):
    total_revenue = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.status == "Success"
    ).scalar() or 0.0

    bookings_count = db.query(
        models.Booking.status, func.count(models.Booking.id)
    ).group_by(models.Booking.status).all()
    bookings_breakdown = {s: c for s, c in bookings_count}

    payments_method_count = db.query(
        models.Payment.payment_method, func.count(models.Payment.id)
    ).group_by(models.Payment.payment_method).all()
    payments_breakdown = {m: c for m, c in payments_method_count}

    revenue_by_subject = db.query(
        models.Tutor.subject,
        func.sum(models.Payment.amount)
    ).join(models.Booking, models.Booking.tutor_id == models.Tutor.id) \
     .join(models.Payment, models.Payment.booking_id == models.Booking.id) \
     .filter(models.Payment.status == "Success") \
     .group_by(models.Tutor.subject).all()

    return {
        "total_revenue": float(total_revenue),
        "bookings_breakdown": bookings_breakdown,
        "payments_breakdown": payments_breakdown,
        "revenue_by_subject": [{"subject": r[0], "revenue": float(r[1])} for r in revenue_by_subject],
    }
