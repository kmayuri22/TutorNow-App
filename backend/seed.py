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
        name="Rajesh Kumar",
        email="student@tutornow.com",
        mobile="9876543210",
        password=student_pw,
        role="Student"
    )
    db.add(student)

    # 3. Create Approved Tutor User & Profile
    tutor_pw = auth.get_password_hash("tutor123")
    tutor_user = models.User(
        name="Dr. Sarah Jenkins",
        email="tutor@tutornow.com",
        mobile="9876543211",
        password=tutor_pw,
        role="Tutor"
    )
    db.add(tutor_user)
    db.commit() # commit users to get IDs

    tutor_profile = models.Tutor(
        user_id=tutor_user.id,
        subject="Mathematics, Calculus & Statistics",
        qualification="Ph.D. in Applied Mathematics, IIT Madras",
        specialization="Higher Secondary & Engineering Mathematics",
        experience=8,
        hourly_rate=500.0,
        bio="Hello! I am Dr. Sarah Jenkins, an IIT graduate with over 8 years of teaching experience. I specialize in making complex mathematical concepts simple and intuitive for students.",
        profile_image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
        rating=4.8,
        languages="English, Hindi, Tamil",
        teaching_mode="Both",
        location_city="Chennai",
        location_address="Anna Nagar, Chennai, Tamil Nadu",
        latitude=13.0850,
        longitude=80.2101,
        is_online=True,
        status="Approved",
        is_verified=True,
        approved_at=datetime.datetime.utcnow()
    )
    db.add(tutor_profile)

    # 4. Create Admin User
    admin_pw = auth.get_password_hash("admin123")
    admin = models.User(
        name="System Admin",
        email="admin@tutornow.com",
        mobile="9876543212",
        password=admin_pw,
        role="Admin"
    )
    db.add(admin)
    db.commit()

    # 5. Create Pending Tutor (Needs Admin Approval)
    tutor_user2 = models.User(
        name="James Miller",
        email="james@tutornow.com",
        mobile="9876543213",
        password=tutor_pw,
        role="Tutor"
    )
    db.add(tutor_user2)
    db.commit()

    tutor_profile2 = models.Tutor(
        user_id=tutor_user2.id,
        subject="Computer Science, Python & Data Structures",
        qualification="B.Tech in Computer Science, NIT Trichy",
        specialization="Programming & Web Development",
        experience=3,
        hourly_rate=400.0,
        bio="Hey there! I am James, a software engineer and tutor. I teach programming fundamentals, data structures, and Python/JavaScript web development with practical projects.",
        profile_image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        rating=4.5,
        languages="English, Hindi",
        teaching_mode="Online",
        location_city="Bengaluru",
        location_address="Indiranagar, Bengaluru, Karnataka",
        latitude=12.9716,
        longitude=77.5946,
        is_online=False,
        status="Pending",
        is_verified=False
    )
    db.add(tutor_profile2)
    db.commit()

    # Seed document for pending tutor
    doc1 = models.TutorDocument(
        tutor_id=tutor_profile2.id,
        file_name="BTech_Degree_Certificate.pdf",
        file_path="sample_degree.pdf",
        file_type="pdf",
        doc_label="Degree Certificate"
    )
    db.add(doc1)
    db.commit()

    # 6. Create Availability slots for Approved Tutor (Dr. Sarah Jenkins)
    today = datetime.date.today()
    slots = [
        models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(10, 0), end_time=datetime.time(11, 0), status="Booked"),
        models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(14, 0), end_time=datetime.time(15, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(10, 0), end_time=datetime.time(11, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(11, 0), end_time=datetime.time(12, 0), status="Available"),
        models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=2), start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), status="Available"),
    ]
    db.add_all(slots)
    db.commit()

    # 7. Create a past Booking, Payment and Review
    past_booking = models.Booking(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        booking_date=today - datetime.timedelta(days=2),
        session_time="10:00 - 11:00",
        status="Completed",
        payment_status="Paid",
        session_type="VIDEO_CALL",
        subject="Mathematics"
    )
    db.add(past_booking)
    db.commit()

    past_payment = models.Payment(
        booking_id=past_booking.id,
        amount=500.0,
        payment_method="UPI",
        transaction_id="TXN-DEMO12345678",
        receipt_number="RCP-78901234",
        status="Success"
    )
    db.add(past_payment)

    past_review = models.Review(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        rating=5.0,
        comment="Dr. Sarah is an amazing tutor! She explained calculus concepts very clearly with practical examples."
    )
    db.add(past_review)
    db.commit()

    # 8. Create an active in-person Booking for Rajesh & Dr. Sarah
    active_booking = models.Booking(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        booking_date=today,
        session_time="10:00 - 11:00",
        status="Accepted",
        payment_status="Paid",
        session_type="IN_PERSON",
        student_lat=13.0282,
        student_lng=80.0169,
        student_address="Saveetha Engineering College, Thandalam, Chennai",
        tutor_lat=13.0850,
        tutor_lng=80.2101,
        tutor_address="Anna Nagar, Chennai",
        tracking_status="Journey Started",
        subject="Mathematics"
    )
    db.add(active_booking)
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
        booking_id=active_booking.id,
        latitude=13.0850,
        longitude=80.2101,
        status="Journey Started"
    )
    db.add(tracking_event)

    # 9. Create notifications
    notifs = [
        models.Notification(user_id=student.id, message="Welcome to TutorNow! Browse tutors to book your first session.", status="Unread"),
        models.Notification(user_id=tutor_user.id, message="Welcome to TutorNow! Your tutor profile is approved.", status="Unread"),
    ]
    db.add_all(notifs)
    db.commit()

def seed_if_empty():
    db: Session = SessionLocal()
    try:
        user_count = db.query(models.User).filter(models.User.role != "Admin").count()
        if user_count > 0:
            print("[OK] Demo users already exist in database.")
            return

        print("[INFO] DB has no demo users. Populating demo accounts & bookings...")
        # Create Student
        student_pw = auth.get_password_hash("student123")
        student = models.User(
            name="Rajesh Kumar",
            email="student@tutornow.com",
            mobile="9876543210",
            password=student_pw,
            role="Student"
        )
        db.add(student)

        # Create Tutor
        tutor_pw = auth.get_password_hash("tutor123")
        tutor_user = models.User(
            name="Dr. Sarah Jenkins",
            email="tutor@tutornow.com",
            mobile="9876543211",
            password=tutor_pw,
            role="Tutor"
        )
        db.add(tutor_user)
        db.commit()

        tutor_profile = models.Tutor(
            user_id=tutor_user.id,
            bio="Ph.D. in Physics with 8+ years of experience teaching high school and college students.",
            subjects="Physics, Mathematics, Calculus",
            hourly_rate=450.0,
            experience_years=8,
            education="Ph.D. in Applied Physics, IIT Madras",
            is_approved=True,
            city="Chennai",
            rating=4.9,
            total_reviews=24
        )
        db.add(tutor_profile)
        db.commit()

        tutor_loc = models.TutorLocation(
            tutor_id=tutor_profile.id,
            latitude=13.0282,
            longitude=80.0169,
            address="Saveetha Engineering College, Thandalam, Chennai"
        )
        db.add(tutor_loc)
        db.commit()

        print("[SUCCESS] Auto-seeded default student and tutor accounts.")
    except Exception as e:
        print(f"[WARN] Error during seed_if_empty: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

