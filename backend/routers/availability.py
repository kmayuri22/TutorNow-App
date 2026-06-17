from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models
import schemas
import auth
from websocket import manager

router = APIRouter(prefix="/api/availability", tags=["Availability"])

@router.post("", response_model=schemas.AvailabilityResponse, status_code=status.HTTP_201_CREATED)
async def add_availability(
    slot: schemas.AvailabilityCreate,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Basic validations
    if slot.start_time >= slot.end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time")

    # Check for duplicate availability
    duplicate = db.query(models.Availability).filter(
        models.Availability.tutor_id == tutor.id,
        models.Availability.date == slot.date,
        models.Availability.start_time == slot.start_time,
        models.Availability.end_time == slot.end_time
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="This availability slot already exists")

    new_slot = models.Availability(
        tutor_id=tutor.id,
        date=slot.date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        status="Available"
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    # Broadcast availability updates to students via WebSocket
    await manager.broadcast({
        "type": "availability_added",
        "tutor_id": tutor.id,
        "tutor_name": current_user.name,
        "slot_id": new_slot.id,
        "date": str(new_slot.date),
        "time": f"{new_slot.start_time.strftime('%H:%M')} - {new_slot.end_time.strftime('%H:%M')}"
    })

    return new_slot

@router.get("", response_model=List[schemas.AvailabilityResponse])
def get_my_availability(
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
        
    return db.query(models.Availability).filter(
        models.Availability.tutor_id == tutor.id
    ).order_by(models.Availability.date.asc(), models.Availability.start_time.asc()).all()

@router.delete("/{slot_id}", status_code=status.HTTP_200_OK)
async def delete_availability(
    slot_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db)
):
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    slot = db.query(models.Availability).filter(
        models.Availability.id == slot_id,
        models.Availability.tutor_id == tutor.id
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    if slot.status == "Booked":
        raise HTTPException(status_code=400, detail="Cannot delete a booked availability slot. Please cancel the booking first.")

    db.delete(slot)
    db.commit()

    # Broadcast removal via WebSocket
    await manager.broadcast({
        "type": "availability_removed",
        "tutor_id": tutor.id,
        "slot_id": slot_id
    })

    return {"message": "Availability slot deleted successfully"}
