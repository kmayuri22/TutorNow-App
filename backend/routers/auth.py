from datetime import timedelta
import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory dictionary for mock password reset codes: {email: temp_code}
reset_codes = {}

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Hash password and create user
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # If the user is a tutor, automatically create a Tutor profile
    if new_user.role == "Tutor":
        new_tutor = models.Tutor(
            user_id=new_user.id,
            subject="General",
            qualification="Degree",
            experience=0,
            hourly_rate=20.0,
            bio="Write your tutor bio here...",
            profile_image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150", # default placeholder image
            rating=5.0
        )
        db.add(new_tutor)
        db.commit()
        
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "user_id": user.id
    }

# FastAPI Docs Form Support
@router.post("/login-form", response_model=schemas.Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "user_id": user.id
    }

@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered"
        )
    
    # Generate 6-digit temp code
    code = ''.join(random.choices(string.digits, k=6))
    reset_codes[request.email] = code
    
    # In a real app, send an email. We simulate it by returning the code in the response.
    return {
        "message": f"Password reset code sent successfully.",
        "temp_code": code # For demo/evaluation purposes, return it
    }

@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    if request.email not in reset_codes or reset_codes[request.email] != request.temp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password reset code"
        )
    
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.password = auth.get_password_hash(request.new_password)
    db.commit()
    
    # Clear the code
    del reset_codes[request.email]
    
    return {"message": "Password has been reset successfully"}

@router.get("/profile")
def get_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Return profile including detailed role fields if applicable
    user_info = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at
    }
    
    if current_user.role == "Tutor":
        tutor_profile = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if tutor_profile:
            user_info["tutor_details"] = {
                "id": tutor_profile.id,
                "subject": tutor_profile.subject,
                "qualification": tutor_profile.qualification,
                "experience": tutor_profile.experience,
                "hourly_rate": tutor_profile.hourly_rate,
                "bio": tutor_profile.bio,
                "profile_image": tutor_profile.profile_image,
                "rating": tutor_profile.rating
            }
            
    return user_info

@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    user_update: schemas.UserUpdate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.email is not None:
        # Check if email is already taken
        exists = db.query(models.User).filter(models.User.email == user_update.email, models.User.id != current_user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_update.email
    if user_update.password is not None:
        current_user.password = auth.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user
