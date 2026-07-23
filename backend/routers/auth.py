import datetime
import random
import string
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory dictionary for mock password reset codes: {email: temp_code}
reset_codes = {}


def _record_login(
    db: Session,
    email: str,
    login_status: str,
    user: models.User = None,
    failure_reason: str = None,
    ip_address: str = None,
    device_info: str = None,
) -> models.LoginHistory:
    """Helper: insert a LoginHistory row and return it."""
    log = models.LoginHistory(
        user_id=user.id if user else None,
        email=email,
        role=user.role if user else None,
        ip_address=ip_address or "unknown",
        device_info=device_info or "unknown",
        login_status=login_status,
        failure_reason=failure_reason,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _create_session(db: Session, user: models.User, token: str, login_history_id: int):
    """Store the JWT session (JTI) in UserSession table for logout tracking."""
    payload = auth.get_token_payload(token)
    if not payload:
        return
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti:
        return
    expires_at = datetime.datetime.utcfromtimestamp(exp) if exp else (
        datetime.datetime.utcnow() + datetime.timedelta(minutes=60)
    )
    session = models.UserSession(
        user_id=user.id,
        token_jti=jti,
        login_history_id=login_history_id,
        expires_at=expires_at,
        invalidated=False,
    )
    db.add(session)
    db.commit()


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Block Admin self-registration — Admin is predefined and created on server startup
    if user_data.role == "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin registration is not allowed. Only Student and Tutor accounts can be registered."
        )

    # Check for duplicate email
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Check for duplicate mobile
    if user_data.mobile:
        if db.query(models.User).filter(models.User.mobile == user_data.mobile).first():
            raise HTTPException(status_code=400, detail="Mobile number is already registered")

    # Hash password and create user
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        mobile=user_data.mobile,
        password=hashed_password,
        role=user_data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If registering as a Student, create a minimal student profile (no extra table needed)
    # If registering as a Tutor, create empty Tutor profile with Pending status
    if new_user.role == "Tutor":
        new_tutor = models.Tutor(
            user_id=new_user.id,
            subject="",
            qualification="",
            experience=0,
            hourly_rate=0.0,
            bio="",
            profile_image=None,
            rating=0.0,
            status="Pending",
            is_verified=False,
        )
        db.add(new_tutor)
        db.commit()

    return new_user


@router.post("/register/tutor", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_tutor_full(user_data: schemas.TutorRegisterCreate, db: Session = Depends(get_db)):
    """
    Full tutor registration with all profile details.
    After this, admin approval is required before dashboard access.
    """
    # Block Admin registration via this endpoint too
    if getattr(user_data, 'role', None) == "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin registration is not allowed."
        )

    # Check for duplicate email
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Check for duplicate mobile
    if user_data.mobile:
        if db.query(models.User).filter(models.User.mobile == user_data.mobile).first():
            raise HTTPException(status_code=400, detail="Mobile number is already registered")

    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        mobile=user_data.mobile,
        password=hashed_password,
        role="Tutor",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_tutor = models.Tutor(
        user_id=new_user.id,
        subject=user_data.subject or "",
        qualification=user_data.qualification or "",
        specialization=user_data.specialization,
        experience=user_data.experience or 0,
        hourly_rate=user_data.hourly_rate or 0.0,
        bio=user_data.bio,
        profile_image=None,
        rating=0.0,
        languages=user_data.languages,
        teaching_mode=user_data.teaching_mode or "Online",
        location_city=user_data.location_city,
        location_address=user_data.location_address,
        status="Pending",
        is_verified=False,
    )
    db.add(new_tutor)
    db.commit()

    return new_user


@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    device = request.headers.get("User-Agent", "unknown")[:500]

    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()

    # Wrong credentials
    if not user or not auth.verify_password(user_credentials.password, user.password):
        _record_login(
            db,
            email=user_credentials.email,
            login_status="Failed",
            user=user,
            failure_reason="Invalid email or password",
            ip_address=ip,
            device_info=device,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Suspended account
    if user.is_suspended:
        _record_login(db, email=user.email, login_status="Failed", user=user,
                      failure_reason="Account suspended", ip_address=ip, device_info=device)
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")

    # Tutor-specific checks
    tutor_status = None
    if user.role == "Tutor":
        tutor_profile = db.query(models.Tutor).filter(models.Tutor.user_id == user.id).first()
        if tutor_profile:
            tutor_status = tutor_profile.status
            if tutor_profile.status == "Pending":
                _record_login(db, email=user.email, login_status="Failed", user=user,
                              failure_reason="Tutor pending approval", ip_address=ip, device_info=device)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="PENDING_APPROVAL"
                )
            elif tutor_profile.status == "Rejected":
                reason = tutor_profile.rejection_reason or "No reason provided."
                _record_login(db, email=user.email, login_status="Failed", user=user,
                              failure_reason=f"Tutor rejected: {reason}", ip_address=ip, device_info=device)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"REJECTED:{reason}"
                )

    # Successful login – create token
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})

    # Record login history
    log = _record_login(db, email=user.email, login_status="Success", user=user,
                        ip_address=ip, device_info=device)

    # Register the session (JTI) in UserSession
    _create_session(db, user, access_token, log.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "user_id": user.id,
        "tutor_status": tutor_status,
    }


@router.post("/login-form", response_model=schemas.Token)
def login_form(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """FastAPI Swagger UI form-based login (delegates to same logic)."""
    ip = request.client.host if request.client else "unknown"
    device = request.headers.get("User-Agent", "unknown")[:500]

    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    tutor_status = None
    if user.role == "Tutor":
        tp = db.query(models.Tutor).filter(models.Tutor.user_id == user.id).first()
        if tp:
            tutor_status = tp.status

    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    log = _record_login(db, email=user.email, login_status="Success", user=user,
                        ip_address=ip, device_info=device)
    _create_session(db, user, access_token, log.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "user_id": user.id,
        "tutor_status": tutor_status,
    }


@router.post("/logout")
def logout(
    current_user: models.User = Depends(auth.get_current_user),
    token: str = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Invalidate current JWT session."""
    payload = auth.get_token_payload(token)
    if payload:
        jti = payload.get("jti")
        if jti:
            session = db.query(models.UserSession).filter(
                models.UserSession.token_jti == jti
            ).first()
            if session:
                session.invalidated = True
                # Record logout time in login history
                if session.login_history_id:
                    log = db.query(models.LoginHistory).filter(
                        models.LoginHistory.id == session.login_history_id
                    ).first()
                    if log:
                        log.logout_time = datetime.datetime.utcnow()
                db.commit()
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    import secrets
    code = ''.join(secrets.choice(string.digits) for _ in range(6))
    reset_codes[request.email] = code

    return {
        "message": "Password reset code sent successfully.",
        "temp_code": code  # For demo/evaluation: return the code directly
    }


@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    if request.email not in reset_codes or reset_codes[request.email] != request.temp_code:
        raise HTTPException(status_code=400, detail="Invalid email or password reset code")

    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = auth.get_password_hash(request.new_password)
    db.commit()
    del reset_codes[request.email]

    return {"message": "Password has been reset successfully"}


@router.get("/profile")
def get_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    user_info = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "role": current_user.role,
        "is_suspended": current_user.is_suspended,
        "created_at": current_user.created_at,
    }

    if current_user.role == "Tutor":
        tutor_profile = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
        if tutor_profile:
            docs = db.query(models.TutorDocument).filter(
                models.TutorDocument.tutor_id == tutor_profile.id
            ).all()
            user_info["tutor_details"] = {
                "id": tutor_profile.id,
                "subject": tutor_profile.subject,
                "qualification": tutor_profile.qualification,
                "specialization": tutor_profile.specialization,
                "experience": tutor_profile.experience,
                "hourly_rate": tutor_profile.hourly_rate,
                "bio": tutor_profile.bio,
                "profile_image": tutor_profile.profile_image,
                "rating": tutor_profile.rating,
                "languages": tutor_profile.languages,
                "teaching_mode": tutor_profile.teaching_mode,
                "location_city": tutor_profile.location_city,
                "location_address": tutor_profile.location_address,
                "latitude": tutor_profile.latitude,
                "longitude": tutor_profile.longitude,
                "is_online": tutor_profile.is_online,
                "status": tutor_profile.status,
                "rejection_reason": tutor_profile.rejection_reason,
                "approved_at": tutor_profile.approved_at,
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

    return user_info


@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.email is not None:
        exists = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != current_user.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_update.email
    if user_update.mobile is not None:
        exists = db.query(models.User).filter(
            models.User.mobile == user_update.mobile,
            models.User.id != current_user.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Mobile number already registered")
        current_user.mobile = user_update.mobile
    if user_update.password is not None:
        current_user.password = auth.get_password_hash(user_update.password)

    db.commit()
    db.refresh(current_user)
    return current_user
