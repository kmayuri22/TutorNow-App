from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, date, time

# ─────────────────────────────────────────────
# Token & Auth Schemas
# ─────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str
    user_id: int
    tutor_status: Optional[str] = None   # "Pending" | "Approved" | "Rejected" – for Tutor role

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    jti: Optional[str] = None            # JWT ID for session tracking

class UserBase(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    role: str = "Student"

class UserCreate(UserBase):
    password: str

class TutorRegisterCreate(BaseModel):
    """Full registration payload for tutor role (Step 1 + Step 2 combined)."""
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    password: str
    role: str = "Tutor"
    # Tutor profile fields
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    subject: Optional[str] = None          # Comma-separated
    experience: Optional[int] = 0
    hourly_rate: Optional[float] = 0.0
    languages: Optional[str] = None        # Comma-separated
    teaching_mode: Optional[str] = "Online"
    location_city: Optional[str] = None
    location_address: Optional[str] = None
    bio: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    temp_code: str
    new_password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_suspended: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Tutor Schemas
# ─────────────────────────────────────────────
class TutorBase(BaseModel):
    subject: str = ""
    qualification: str = ""
    specialization: Optional[str] = None
    experience: int = Field(default=0, ge=0)
    hourly_rate: float = Field(default=0.0, ge=0.0)
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    languages: Optional[str] = None
    teaching_mode: Optional[str] = "Online"
    location_city: Optional[str] = None
    location_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TutorCreate(TutorBase):
    pass

class TutorUpdate(BaseModel):
    subject: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience: Optional[int] = None
    hourly_rate: Optional[float] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    name: Optional[str] = None
    languages: Optional[str] = None
    teaching_mode: Optional[str] = None
    location_city: Optional[str] = None
    location_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_online: Optional[bool] = None

class TutorApprovalAction(BaseModel):
    action: str   # "approve" | "reject" | "request_changes"
    reason: Optional[str] = None

class TutorDocumentResponse(BaseModel):
    id: int
    tutor_id: int
    file_name: str
    file_path: str
    file_type: str
    doc_label: Optional[str] = None
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TutorResponse(TutorBase):
    id: int
    user_id: int
    rating: float
    is_verified: bool
    is_online: bool = False
    status: str = "Pending"
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    user: UserResponse
    documents: List[TutorDocumentResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Availability Schemas
# ─────────────────────────────────────────────
class AvailabilityBase(BaseModel):
    date: date
    start_time: time
    end_time: time

class AvailabilityCreate(AvailabilityBase):
    pass

class AvailabilityUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[str] = None

class AvailabilityResponse(AvailabilityBase):
    id: int
    tutor_id: int
    status: str
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Booking Schemas
# ─────────────────────────────────────────────
class BookingCreate(BaseModel):
    tutor_id: int
    booking_date: Optional[date] = None
    session_time: Optional[str] = None
    session_type: str = "VIDEO_CALL"         # IN_PERSON | VIDEO_CALL
    student_lat: Optional[float] = None
    student_lng: Optional[float] = None
    tutor_lat: Optional[float] = None
    tutor_lng: Optional[float] = None
    student_address: Optional[str] = None
    tutor_address: Optional[str] = None
    subject: Optional[str] = None
    booking_type: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration: Optional[int] = 60
    notes: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None

class BookingStatusUpdate(BaseModel):
    status: str

class BookingResponse(BaseModel):
    id: int
    student_id: int
    tutor_id: int
    booking_date: Optional[date] = None
    session_time: Optional[str] = None
    status: str
    payment_status: str
    session_type: str
    tracking_status: Optional[str] = None
    student_lat: Optional[float] = None
    student_lng: Optional[float] = None
    tutor_lat: Optional[float] = None
    tutor_lng: Optional[float] = None
    student_address: Optional[str] = None
    tutor_address: Optional[str] = None
    subject: Optional[str] = None
    booking_type: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration: Optional[int] = 60
    notes: Optional[str] = None
    student_name: Optional[str] = None
    tutor_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class BookingDetailResponse(BookingResponse):
    student: UserResponse
    tutor: TutorResponse
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Payment Schemas
# ─────────────────────────────────────────────
class PaymentCreate(BaseModel):
    booking_id: int
    payment_method: str   # "UPI" | "Paytm" | "Credit Card" | "Debit Card" | "Net Banking"
    amount: float
    upi_id: Optional[str] = None    # For UPI payments
    paytm_mobile: Optional[str] = None  # For Paytm

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    payment_method: str
    transaction_id: str
    receipt_number: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Review Schemas
# ─────────────────────────────────────────────
class ReviewCreate(BaseModel):
    tutor_id: int
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None

class ReviewResponse(ReviewCreate):
    id: int
    student_id: int
    created_at: datetime
    student: UserResponse
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Notification Schemas
# ─────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Login History Schemas
# ─────────────────────────────────────────────
class LoginHistoryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    email: str
    role: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    login_status: str
    failure_reason: Optional[str] = None
    login_time: datetime
    logout_time: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Admin Analytics
# ─────────────────────────────────────────────
class DashboardAnalytics(BaseModel):
    total_students: int
    total_tutors: int
    pending_tutors: int
    approved_tutors: int
    total_bookings: int
    total_payments: float
    pending_bookings: int
    completed_bookings: int
    popular_subjects: List[dict]
    recent_bookings: List[BookingDetailResponse]

# ─────────────────────────────────────────────
# Dual Booking System – New Schemas
# ─────────────────────────────────────────────

class TutorLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

class TutorLocationResponse(BaseModel):
    id: int
    tutor_id: int
    latitude: float
    longitude: float
    address: Optional[str] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LiveTrackingEvent(BaseModel):
    latitude: float
    longitude: float
    status: Optional[str] = None

class LiveTrackingResponse(BaseModel):
    id: int
    booking_id: int
    latitude: float
    longitude: float
    status: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class VideoSessionCreate(BaseModel):
    booking_id: int

class VideoSessionResponse(BaseModel):
    id: int
    booking_id: int
    meeting_id: str
    meeting_link: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str
    model_config = ConfigDict(from_attributes=True)
