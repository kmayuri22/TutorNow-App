import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
import models
import auth

def seed_database():
    db: Session = SessionLocal()
    
    # 1. Clear database tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("Database tables initialized.")

    # 2. Create Student
    student_pw = auth.get_password_hash("student123")
    student = models.User(
        name="Alex Smith",
        email="student@tutornow.com",
        password=student_pw,
        role="Student"
    )
    db.add(student)
    
    # 3. Create Tutor User & Profile
    tutor_pw = auth.get_password_hash("tutor123")
    tutor_user = models.User(
        name="Dr. Sarah Jenkins",
        email="tutor@tutornow.com",
        password=tutor_pw,
        role="Tutor"
    )
    db.add(tutor_user)
    db.commit() # commit users to get IDs
    
    tutor_profile = models.Tutor(
        user_id=tutor_user.id,
        subject="Mathematics & Calculus",
        qualification="Ph.D. in Applied Mathematics, MIT",
        experience=8,
        hourly_rate=45.0,
        bio="Hello! I am Dr. Sarah Jenkins, an MIT graduate with over 8 years of teaching experience. I specialize in making complex mathematical concepts easy to understand. I teach Algebra, Calculus, Trigonometry, and Statistics. Looking forward to helping you achieve your academic goals!",
        profile_image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
        rating=4.8,
        is_verified=True
    )
    db.add(tutor_profile)
    
    # 4. Create Admin User
    admin_pw = auth.get_password_hash("admin123")
    admin = models.User(
        name="System Admin",
        email="admin@tutornow.com",
        password=admin_pw,
        role="Admin"
    )
    db.add(admin)
    db.commit()
    
    # 5. Create Another Tutor (not verified yet)
    tutor_user2 = models.User(
        name="James Miller",
        email="james@tutornow.com",
        password=tutor_pw,
        role="Tutor"
    )
    db.add(tutor_user2)
    db.commit()
    
    tutor_profile2 = models.Tutor(
        user_id=tutor_user2.id,
        subject="Computer Science & Python",
        qualification="B.S. in Computer Science, Stanford",
        experience=3,
        hourly_rate=35.0,
        bio="Hey there! I am James, a software engineer and tutor. I teach programming fundamentals, data structures, and Python/JavaScript web development. I focus on hands-on practice and building cool projects.",
        profile_image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        rating=4.5,
        is_verified=False # Pending verification
    )
    db.add(tutor_profile2)
    db.commit()
    
    # 6. Create Availability slots for Dr. Sarah Jenkins (tutor_profile)
    today = datetime.date.today()
    slots = [
        # Today's slots
        models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(10, 0), end_time=datetime.time(11, 0), status="Booked"),
        models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(14, 0), end_time=datetime.time(15, 0), status="Available"),
        # Tomorrow's slots
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(10, 0), end_time=datetime.time(11, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(11, 0), end_time=datetime.time(12, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(16, 0), end_time=datetime.time(17, 0), status="Available"),
        # Day after tomorrow
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=2), start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=2), start_time=datetime.time(15, 0), end_time=datetime.time(16, 0), status="Available"),
    ]
    db.add_all(slots)
    db.commit()
    
    # 7. Create a past Booking, Payment and Review for Alex & Dr. Sarah Jenkins
    past_booking = models.Booking(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        booking_date=today - datetime.timedelta(days=2),
        session_time="10:00 - 11:00",
        status="Completed",
        payment_status="Paid",
        session_type="VIDEO_CALL"
    )
    db.add(past_booking)
    db.commit()
    
    past_payment = models.Payment(
        booking_id=past_booking.id,
        amount=45.0,
        payment_method="Credit Card",
        transaction_id="TXN-DEMO12345678",
        status="Success"
    )
    db.add(past_payment)
    
    past_review = models.Review(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        rating=5.0,
        comment="Dr. Sarah is an amazing tutor! She helped me understand integration and differentiation concepts in just one hour. Highly recommended!"
    )
    db.add(past_review)
    db.commit()
    
    # 8. Create an in-person pending Booking for Alex Smith (today 10:00 - 11:00, which has slot status Booked)
    pending_booking = models.Booking(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        booking_date=today,
        session_time="10:00 - 11:00",
        status="Accepted", # Set to Accepted so live tracking can be demonstrated
        payment_status="Paid",
        session_type="IN_PERSON",
        student_lat=12.9815,
        student_lng=80.2180,
        tutor_lat=13.0850,
        tutor_lng=80.2101,
        student_address="Velachery, Chennai",
        tutor_address="Anna Nagar, Chennai",
        tracking_status="Journey Started"
    )
    db.add(pending_booking)
    db.commit()

    # Seed tutor location
    tutor_loc = models.TutorLocation(
        tutor_id=tutor_profile.id,
        latitude=13.0850,
        longitude=80.2101,
        address="Anna Nagar, Chennai"
    )
    db.add(tutor_loc)
    
    # Seed live tracking event
    tracking_event = models.LiveTracking(
        booking_id=pending_booking.id,
        latitude=13.0850,
        longitude=80.2101,
        status="Journey Started"
    )
    db.add(tracking_event)
    db.commit()
    
    # 9. Create notifications
    notifs = [
        models.Notification(user_id=student.id, message="Welcome to TutorNow! Start search for tutors to book your first session.", status="Unread"),
        models.Notification(user_id=tutor_user.id, message="Welcome to TutorNow! Set your teaching availability slots in your dashboard.", status="Unread"),
    ]
    db.add_all(notifs)
    db.commit()
    
    print("Database seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed_database()
