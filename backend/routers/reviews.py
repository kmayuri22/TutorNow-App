from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])

def update_tutor_average_rating(db: Session, tutor_id: int):
    # Recalculate average rating for the tutor
    avg_rating_query = db.query(func.avg(models.Review.rating)).filter(
        models.Review.tutor_id == tutor_id
    ).scalar()

    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if tutor:
        # If no reviews left, default back to 5.0
        tutor.rating = round(float(avg_rating_query), 1) if avg_rating_query is not None else 5.0
        db.commit()

@router.post("", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def add_review(
    review_data: schemas.ReviewCreate,
    current_user: models.User = Depends(auth.RoleChecker(["Student"])),
    db: Session = Depends(get_db)
):
    # Verify tutor exists
    tutor = db.query(models.Tutor).filter(models.Tutor.id == review_data.tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Business rule: Must have at least one booking with this tutor
    booking_exists = db.query(models.Booking).filter(
        models.Booking.student_id == current_user.id,
        models.Booking.tutor_id == tutor.id
    ).first()

    if not booking_exists:
        raise HTTPException(
            status_code=400, 
            detail="You can only review a tutor after booking at least one session with them"
        )

    # Check if student already reviewed this tutor (avoid duplicate spam reviews)
    already_reviewed = db.query(models.Review).filter(
        models.Review.student_id == current_user.id,
        models.Review.tutor_id == tutor.id
    ).first()
    if already_reviewed:
        raise HTTPException(status_code=400, detail="You have already submitted a review for this tutor")

    new_review = models.Review(
        student_id=current_user.id,
        tutor_id=tutor.id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    # Update average rating
    update_tutor_average_rating(db, tutor.id)

    return new_review

@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Authorize: Only writer or Admin
    if current_user.role != "Admin" and review.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")

    tutor_id = review.tutor_id
    db.delete(review)
    db.commit()

    # Update average rating
    update_tutor_average_rating(db, tutor_id)

    return {"message": "Review deleted successfully"}

@router.get("/tutor/{tutor_id}", response_model=List[schemas.ReviewResponse])
def get_tutor_reviews(tutor_id: int, db: Session = Depends(get_db)):
    tutor = db.query(models.Tutor).filter(models.Tutor.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
        
    return db.query(models.Review).filter(
        models.Review.tutor_id == tutor_id
    ).order_by(models.Review.created_at.desc()).all()
