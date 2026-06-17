from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()

@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.status = "Read"
    db.commit()
    return {"message": "Notification marked as read"}

@router.put("/read-all")
def mark_all_notifications_as_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.status == "Unread"
    ).update({"status": "Read"}, synchronize_session=False)
    
    db.commit()
    return {"message": "All notifications marked as read"}
