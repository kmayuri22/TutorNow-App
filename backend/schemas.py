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

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Student"

class UserCreate(UserBase):
    password: str

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
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────
# Tutor Schemas
# ─────────────────────────────────────────────
class TutorBase(BaseModel):
    subject: str
    qualification: str
    experience: int = Field(default=0, ge=0)
    hourly_rate: float = Field(default=0.0, ge=0.0)
    bio: Optional[str] = None
    profile_image: Optional[str] = None

class TutorCreate(TutorBase):
    pass

class TutorUpdate(BaseModel):
    subject: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    hourly_rate: Optional[float] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    name: Optional[str] = None

class TutorResponse(TutorBase):
    id: int
    user_id: int
    rating: float
    is_verified: bool
    user: UserResponse
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
# Booking Schemas – updated for dual session type
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
    # Compatibility fields for Mobile App
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
    # Compatibility fields for Mobile App
    subject: Optional[str] = None
    booking_type: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration: Optional[int] = 60
    notes: Optional[str] = None
    student_name: Optional[str] = None
    tutor_name: Optional[str] = None
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
    payment_method: str
    amount: float

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    payment_method: str
    transaction_id: str
    status: str
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
# Admin Analytics
# ─────────────────────────────────────────────
class DashboardAnalytics(BaseModel):
    total_students: int
    total_tutors: int
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
    status: str  # Journey Started | Tutor Nearby | Tutor Arrived | Session Started | Session Completed

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
