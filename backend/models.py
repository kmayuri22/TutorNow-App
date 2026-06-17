import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Time, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Student")  # Student, Tutor, Admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    tutor_profile = relationship("Tutor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings_as_student = relationship("Booking", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    reviews_written = relationship("Review", back_populates="student", cascade="all, delete-orphan")


class Tutor(Base):
    __tablename__ = "tutors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    subject = Column(String(255), nullable=False)
    qualification = Column(String(255), nullable=False)
    experience = Column(Integer, nullable=False, default=0)
    hourly_rate = Column(Float, nullable=False, default=0.0)
    bio = Column(Text, nullable=True)
    profile_image = Column(String(500), nullable=True)
    rating = Column(Float, nullable=False, default=0.0)
    is_verified = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="tutor_profile")
    availabilities = relationship("Availability", back_populates="tutor", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="tutor", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="tutor", cascade="all, delete-orphan")
    location = relationship("TutorLocation", back_populates="tutor", uselist=False, cascade="all, delete-orphan")


class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(String(50), nullable=False, default="Available")  # Available, Booked

    # Relationships
    tutor = relationship("Tutor", back_populates="availabilities")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="CASCADE"), nullable=False)
    booking_date = Column(Date, nullable=False)
    session_time = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Accepted, Rejected, Cancelled, Completed
    payment_status = Column(String(50), nullable=False, default="Unpaid")  # Unpaid, Paid

    # Dual Booking System fields
    session_type = Column(String(20), nullable=False, default="VIDEO_CALL")  # IN_PERSON | VIDEO_CALL
    tracking_status = Column(String(50), nullable=True)  # Journey status for IN_PERSON

    # Location fields (stored at time of booking)
    student_lat = Column(Float, nullable=True)
    student_lng = Column(Float, nullable=True)
    tutor_lat = Column(Float, nullable=True)
    tutor_lng = Column(Float, nullable=True)
    student_address = Column(String(500), nullable=True)
    tutor_address = Column(String(500), nullable=True)

    # Relationships
    student = relationship("User", back_populates="bookings_as_student")
    tutor = relationship("Tutor", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    live_tracking = relationship("LiveTracking", back_populates="booking", cascade="all, delete-orphan")
    video_session = relationship("VideoSession", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(100), nullable=False)
    transaction_id = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Success, Failed

    # Relationships
    booking = relationship("Booking", back_populates="payment")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Float, nullable=False, default=0.0)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="reviews_written")
    tutor = relationship("Tutor", back_populates="reviews")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="Unread")  # Unread, Read
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


# ─────────────────────────────────────────────
# Dual Booking System – New Models
# ─────────────────────────────────────────────

class TutorLocation(Base):
    """Stores the tutor's last known GPS position."""
    __tablename__ = "tutor_locations"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="CASCADE"), unique=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    tutor = relationship("Tutor", back_populates="location")


class LiveTracking(Base):
    """Tracks each GPS event during an in-person session journey."""
    __tablename__ = "live_tracking"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(100), nullable=False, default="Journey Started")
    # Status options: Accepted | Journey Started | Tutor Nearby | Tutor Arrived | Session Started | Session Completed
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="live_tracking")


class VideoSession(Base):
    """Stores video session details for VIDEO_CALL bookings."""
    __tablename__ = "video_sessions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    meeting_id = Column(String(255), unique=True, nullable=False)
    meeting_link = Column(String(500), nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default="Scheduled")
    # Status: Scheduled | Active | Ended

    # Relationships
    booking = relationship("Booking", back_populates="video_session")
