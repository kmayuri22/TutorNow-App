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
    subject: Optional[str] = Query(None, description="Filter by subject"),
    qualification: Optional[str] = Query(None, description="Filter by qualification"),
    min_experience: Optional[int] = Query(None, description="Minimum experience in years"),
    min_rating: Optional[float] = Query(None, description="Minimum average rating"),
    min_price: Optional[float] = Query(None, description="Minimum hourly rate"),
    max_price: Optional[float] = Query(None, description="Maximum hourly rate"),
    availability_date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD) availability"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Tutor).join(models.User)

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
        
    if availability_date:
        # Filter tutors who have at least one availability slot on the date that is "Available"
        from datetime import datetime
        try:
            target_date = datetime.strptime(availability_date, "%Y-%m-%d").date()
            query = query.join(models.Availability).filter(
                models.Availability.date == target_date,
                models.Availability.status == "Available"
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    return query.all()

@router.get("/{tutor_id}")
def get_tutor_details(tutor_id: int, db: Session = Depends(get_db)):
    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor not found"
        )
        
    # Return detailed structure: tutor info, availability slots, and reviews with student details
    availabilities = db.query(models.Availability).filter(
        models.Availability.tutor_id == tutor_id,
        models.Availability.status == "Available"
    ).all()
    
    reviews = db.query(models.Review).filter(models.Review.tutor_id == tutor_id).all()
    
    # Format reviews
    formatted_reviews = []
    for r in reviews:
        formatted_reviews.append({
            "id": r.id,
            "student_name": r.student.name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at
        })
        
    tutor_loc = db.query(models.TutorLocation).filter(models.TutorLocation.tutor_id == tutor_id).first()
    location_formatted = None
    if tutor_loc:
        location_formatted = {
            "latitude": tutor_loc.latitude,
            "longitude": tutor_loc.longitude,
            "address": tutor_loc.address
        }
        
    return {
        "id": tutor.id,
        "name": tutor.user.name,
        "email": tutor.user.email,
        "subject": tutor.subject,
        "qualification": tutor.qualification,
        "experience": tutor.experience,
        "hourly_rate": tutor.hourly_rate,
        "bio": tutor.bio,
        "profile_image": tutor.profile_image,
        "rating": tutor.rating,
        "location": location_formatted,
        "availabilities": [
            {
                "id": a.id,
                "date": a.date,
                "start_time": a.start_time.strftime("%H:%M"),
                "end_time": a.end_time.strftime("%H:%M"),
                "status": a.status
            } for a in availabilities
        ],
        "reviews": formatted_reviews
    }

@router.put("/profile", response_model=schemas.TutorResponse)
def update_tutor_profile(
    tutor_data: schemas.TutorUpdate,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Update Tutor fields
    if tutor_data.subject is not None:
        tutor.subject = tutor_data.subject
    if tutor_data.qualification is not None:
        tutor.qualification = tutor_data.qualification
    if tutor_data.experience is not None:
        tutor.experience = tutor_data.experience
    if tutor_data.hourly_rate is not None:
        tutor.hourly_rate = tutor_data.hourly_rate
    if tutor_data.bio is not None:
        tutor.bio = tutor_data.bio
    if tutor_data.profile_image is not None:
        tutor.profile_image = tutor_data.profile_image
        
    # If the tutor sent a name update, update the User model
    if tutor_data.name is not None:
        current_user.name = tutor_data.name
        db.add(current_user)

    db.commit()
    db.refresh(tutor)
    return tutor
