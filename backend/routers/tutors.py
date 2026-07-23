from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/tutors", tags=["Tutors"])


@router.get("", response_model=List[schemas.TutorResponse])
def search_tutors(
    subject: Optional[str] = Query(None),
    qualification: Optional[str] = Query(None),
    min_experience: Optional[int] = Query(None),
    min_rating: Optional[float] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    teaching_mode: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    location_city: Optional[str] = Query(None),
    availability_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Public endpoint – returns only APPROVED tutors."""
    query = db.query(models.Tutor).join(models.User).filter(
        models.Tutor.status == "Approved",
        models.User.is_suspended == False,
    )

    if subject:
        query = query.filter(models.Tutor.subject.ilike(f"%{subject}%"))
    if qualification:
        query = query.filter(models.Tutor.qualification.ilike(f"%{qualification}%"))
    if min_experience is not None:
        query = query.filter(models.Tutor.experience >= min_experience)
    if min_rating is not None:
        query = query.filter(models.Tutor.rating >= min_rating)
    if min_price is not None:
        query = query.filter(models.Tutor.hourly_rate >= min_price)
    if max_price is not None:
        query = query.filter(models.Tutor.hourly_rate <= max_price)
    if teaching_mode:
        query = query.filter(
            or_(
                models.Tutor.teaching_mode == teaching_mode,
                models.Tutor.teaching_mode == "Both",
            )
        )
    if language:
        query = query.filter(models.Tutor.languages.ilike(f"%{language}%"))
    if location_city:
        query = query.filter(models.Tutor.location_city.ilike(f"%{location_city}%"))
    if availability_date:
        from datetime import datetime
        try:
            target_date = datetime.strptime(availability_date, "%Y-%m-%d").date()
            query = query.join(models.Availability).filter(
                models.Availability.date == target_date,
                models.Availability.status == "Available",
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    return query.all()


@router.get("/{tutor_id}")
def get_tutor_details(tutor_id: int, db: Session = Depends(get_db)):
    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    availabilities = db.query(models.Availability).filter(
        models.Availability.tutor_id == tutor_id,
        models.Availability.status == "Available",
    ).all()

    reviews = db.query(models.Review).filter(models.Review.tutor_id == tutor_id).all()
    formatted_reviews = [
        {
            "id": r.id,
            "student_name": r.student.name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
        }
        for r in reviews
    ]

    tutor_loc = db.query(models.TutorLocation).filter(
        models.TutorLocation.tutor_id == tutor_id
    ).first()
    location_formatted = (
        {
            "latitude": tutor_loc.latitude,
            "longitude": tutor_loc.longitude,
            "address": tutor_loc.address,
        }
        if tutor_loc else None
    )

    docs = db.query(models.TutorDocument).filter(
        models.TutorDocument.tutor_id == tutor_id
    ).all()

    return {
        "id": tutor.id,
        "name": tutor.user.name,
        "email": tutor.user.email,
        "mobile": tutor.user.mobile,
        "subject": tutor.subject,
        "qualification": tutor.qualification,
        "specialization": tutor.specialization,
        "experience": tutor.experience,
        "hourly_rate": tutor.hourly_rate,
        "bio": tutor.bio,
        "profile_image": tutor.profile_image,
        "rating": tutor.rating,
        "languages": tutor.languages,
        "teaching_mode": tutor.teaching_mode,
        "location_city": tutor.location_city,
        "location_address": tutor.location_address,
        "latitude": tutor.latitude,
        "longitude": tutor.longitude,
        "is_online": tutor.is_online,
        "status": tutor.status,
        "location": location_formatted,
        "availabilities": [
            {
                "id": a.id,
                "date": a.date,
                "start_time": a.start_time.strftime("%H:%M"),
                "end_time": a.end_time.strftime("%H:%M"),
                "status": a.status,
            }
            for a in availabilities
        ],
        "reviews": formatted_reviews,
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_path": d.file_path,
                "file_type": d.file_type,
                "doc_label": d.doc_label,
            }
            for d in docs
        ],
    }


@router.put("/profile", response_model=schemas.TutorResponse)
def update_tutor_profile(
    tutor_data: schemas.TutorUpdate,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db),
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    fields = [
        "subject", "qualification", "specialization", "experience",
        "hourly_rate", "bio", "profile_image", "languages",
        "teaching_mode", "location_city", "location_address",
        "latitude", "longitude", "is_online",
    ]
    for field in fields:
        val = getattr(tutor_data, field, None)
        if val is not None:
            setattr(tutor, field, val)

    if tutor_data.name is not None:
        current_user.name = tutor_data.name
        db.add(current_user)

    db.commit()
    db.refresh(tutor)
    return tutor


@router.patch("/online-status")
def toggle_online_status(
    is_online: bool,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db),
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    tutor.is_online = is_online
    db.commit()
    return {"is_online": tutor.is_online}
