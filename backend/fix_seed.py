"""
Fix seed script - Adds missing tutor profiles and demo data to the existing Supabase DB.
Users already exist: Admin (id=1), Student Rajesh (id=2), Tutor Dr. Sarah (id=3)
"""
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
import models
import auth

def fix_seed():
    db: Session = SessionLocal()
    try:
        print("=== TutorNow Fix Seed ===")
        
        # Check existing users
        tutor_user = db.query(models.User).filter(models.User.email == "tutor@tutornow.com").first()
        student_user = db.query(models.User).filter(models.User.email == "student@tutornow.com").first()
        admin_user = db.query(models.User).filter(models.User.role == "Admin").first()
        
        print(f"Found: admin={admin_user.email if admin_user else 'MISSING'}, student={student_user.email if student_user else 'MISSING'}, tutor={tutor_user.email if tutor_user else 'MISSING'}")

        # Create tutor profile for Dr. Sarah Jenkins
        existing_tutor_profile = db.query(models.Tutor).filter(models.Tutor.user_id == tutor_user.id).first() if tutor_user else None
        if tutor_user and not existing_tutor_profile:
            tutor_profile = models.Tutor(
                user_id=tutor_user.id,
                subject="Mathematics, Calculus & Statistics",
                qualification="Ph.D. in Applied Mathematics, IIT Madras",
                specialization="Higher Secondary & Engineering Mathematics",
                experience=8,
                hourly_rate=500.0,
                bio="Hello! I am Dr. Sarah Jenkins, an IIT graduate with over 8 years of teaching experience. I specialize in making complex mathematical concepts simple and intuitive for students at all levels - from 10th grade to engineering undergrads.",
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
                approved_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(tutor_profile)
            db.commit()
            db.refresh(tutor_profile)
            print(f"[OK] Created tutor profile: {tutor_user.name} (id={tutor_profile.id})")
        else:
            tutor_profile = existing_tutor_profile
            print(f"[SKIP] Tutor profile already exists (id={tutor_profile.id if tutor_profile else 'N/A'})")

        # Create additional approved tutors
        additional_tutors = [
            {
                "name": "James Miller",
                "email": "james@tutornow.com",
                "mobile": "9876543213",
                "subject": "Computer Science, Python & Data Structures",
                "qualification": "B.Tech in Computer Science, NIT Trichy",
                "specialization": "Programming & Web Development",
                "experience": 3,
                "hourly_rate": 400.0,
                "bio": "Hey there! I am James, a software engineer and passionate tutor. I teach programming fundamentals, data structures, algorithms, and web development using Python and JavaScript. I use real-world projects to make learning practical.",
                "profile_image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
                "rating": 4.6,
                "languages": "English, Hindi",
                "teaching_mode": "Online",
                "location_city": "Bengaluru",
                "location_address": "Indiranagar, Bengaluru, Karnataka",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "is_online": True,
                "status": "Approved",
            },
            {
                "name": "Sophia Rodriguez",
                "email": "sophia@tutornow.com",
                "mobile": "9876543214",
                "subject": "Chemistry & Biochemistry",
                "qualification": "M.Sc. Chemistry, University of Delhi",
                "specialization": "Organic & Physical Chemistry",
                "experience": 5,
                "hourly_rate": 450.0,
                "bio": "Hi! I'm Sophia, a chemistry educator with 5 years of experience. I focus on conceptual clarity and problem-solving techniques that help students ace board exams and competitive tests like JEE and NEET.",
                "profile_image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
                "rating": 4.9,
                "languages": "English, Hindi",
                "teaching_mode": "Both",
                "location_city": "Delhi",
                "location_address": "Connaught Place, New Delhi",
                "latitude": 28.6315,
                "longitude": 77.2167,
                "is_online": True,
                "status": "Approved",
            },
            {
                "name": "Arjun Sharma",
                "email": "arjun@tutornow.com",
                "mobile": "9876543215",
                "subject": "Physics & Engineering Mechanics",
                "qualification": "B.E. Mechanical Engineering, BITS Pilani",
                "specialization": "Classical Mechanics, Thermodynamics & Electromagnetism",
                "experience": 4,
                "hourly_rate": 420.0,
                "bio": "I'm Arjun, a BITS Pilani graduate with a passion for physics. I help students build strong foundations in mechanics, thermodynamics, and electromagnetism using visual models and problem-solving strategies.",
                "profile_image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
                "rating": 4.7,
                "languages": "English, Hindi, Telugu",
                "teaching_mode": "Online",
                "location_city": "Hyderabad",
                "location_address": "Madhapur, Hyderabad, Telangana",
                "latitude": 17.4485,
                "longitude": 78.3908,
                "is_online": True,
                "status": "Approved",
            },
            {
                "name": "Priya Nair",
                "email": "priya@tutornow.com",
                "mobile": "9876543216",
                "subject": "English Literature & Communication",
                "qualification": "M.A. English, Jawaharlal Nehru University",
                "specialization": "Creative Writing, Grammar & Academic English",
                "experience": 6,
                "hourly_rate": 350.0,
                "bio": "Hello! I'm Priya, an English literature and communication skills tutor with 6 years of experience. I help students improve writing, comprehension, grammar, and verbal communication for academics and competitive exams.",
                "profile_image": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400",
                "rating": 4.8,
                "languages": "English, Hindi, Malayalam",
                "teaching_mode": "Both",
                "location_city": "Kochi",
                "location_address": "Marine Drive, Ernakulam, Kerala",
                "latitude": 9.9667,
                "longitude": 76.2833,
                "is_online": True,
                "status": "Approved",
            },
            {
                "name": "Rahul Verma",
                "email": "rahul@tutornow.com",
                "mobile": "9876543217",
                "subject": "Economics & Commerce",
                "qualification": "MBA Finance, IIM Ahmedabad",
                "specialization": "Macro & Microeconomics, Business Finance",
                "experience": 7,
                "hourly_rate": 550.0,
                "bio": "I'm Rahul, an IIM Ahmedabad alumnus with 7 years of economics tutoring experience. I specialize in economics, business studies, accountancy, and finance for Class 11-12 and competitive exams like CA Foundation and CMA.",
                "profile_image": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
                "rating": 4.5,
                "languages": "English, Hindi",
                "teaching_mode": "Online",
                "location_city": "Mumbai",
                "location_address": "Bandra West, Mumbai, Maharashtra",
                "latitude": 19.0596,
                "longitude": 72.8295,
                "is_online": True,
                "status": "Approved",
            },
            {
                "name": "Deepika Menon",
                "email": "deepika@tutornow.com",
                "mobile": "9876543218",
                "subject": "Biology & Genetics",
                "qualification": "M.Sc. Biotechnology, IIT Bombay",
                "specialization": "Cell Biology, Genetics & NEET Biology",
                "experience": 5,
                "hourly_rate": 400.0,
                "bio": "Hi! I'm Deepika, a biotechnology graduate from IIT Bombay. I specialize in biology, genetics, and life sciences for students preparing for NEET and Board exams. I use visual diagrams and mnemonics to make complex topics memorable.",
                "profile_image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
                "rating": 4.9,
                "languages": "English, Hindi, Tamil, Malayalam",
                "teaching_mode": "Online",
                "location_city": "Pune",
                "location_address": "Kothrud, Pune, Maharashtra",
                "latitude": 18.5074,
                "longitude": 73.8077,
                "is_online": True,
                "status": "Approved",
            },
        ]

        for t_data in additional_tutors:
            existing_user = db.query(models.User).filter(models.User.email == t_data["email"]).first()
            if not existing_user:
                tutor_pw = auth.get_password_hash("tutor123")
                new_user = models.User(
                    name=t_data["name"],
                    email=t_data["email"],
                    mobile=t_data["mobile"],
                    password=tutor_pw,
                    role="Tutor"
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                existing_user = new_user
                print(f"[OK] Created user: {t_data['name']}")
            else:
                print(f"[SKIP] User already exists: {t_data['name']}")

            existing_profile = db.query(models.Tutor).filter(models.Tutor.user_id == existing_user.id).first()
            if not existing_profile:
                profile = models.Tutor(
                    user_id=existing_user.id,
                    subject=t_data["subject"],
                    qualification=t_data["qualification"],
                    specialization=t_data["specialization"],
                    experience=t_data["experience"],
                    hourly_rate=t_data["hourly_rate"],
                    bio=t_data["bio"],
                    profile_image=t_data["profile_image"],
                    rating=t_data["rating"],
                    languages=t_data["languages"],
                    teaching_mode=t_data["teaching_mode"],
                    location_city=t_data["location_city"],
                    location_address=t_data["location_address"],
                    latitude=t_data["latitude"],
                    longitude=t_data["longitude"],
                    is_online=t_data["is_online"],
                    status=t_data["status"],
                    is_verified=True,
                    approved_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(profile)
                db.commit()
                db.refresh(profile)
                print(f"[OK] Created tutor profile: {t_data['name']}")
            else:
                print(f"[SKIP] Tutor profile already exists: {t_data['name']}")

        # Create availability slots for Dr. Sarah
        if tutor_profile:
            existing_slots = db.query(models.Availability).filter(models.Availability.tutor_id == tutor_profile.id).count()
            if existing_slots == 0:
                today = datetime.date.today()
                slots = [
                    models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), status="Available"),
                    models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(10, 0), end_time=datetime.time(11, 0), status="Booked"),
                    models.Availability(tutor_id=tutor_profile.id, date=today, start_time=datetime.time(14, 0), end_time=datetime.time(15, 0), status="Available"),
                    models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(10, 0), end_time=datetime.time(11, 0), status="Available"),
                    models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=1), start_time=datetime.time(11, 0), end_time=datetime.time(12, 0), status="Available"),
                    models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=2), start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), status="Available"),
                    models.Availability(tutor_id=tutor_profile.id, date=today + datetime.timedelta(days=3), start_time=datetime.time(15, 0), end_time=datetime.time(16, 0), status="Available"),
                ]
                db.add_all(slots)
                db.commit()
                print(f"[OK] Created {len(slots)} availability slots for Dr. Sarah")
            else:
                print(f"[SKIP] Availability slots already exist ({existing_slots} slots)")

        # Create past booking + payment + review for student
        if student_user and tutor_profile:
            existing_bookings = db.query(models.Booking).filter(models.Booking.student_id == student_user.id).count()
            if existing_bookings == 0:
                today = datetime.date.today()
                past_booking = models.Booking(
                    student_id=student_user.id,
                    tutor_id=tutor_profile.id,
                    booking_date=today - datetime.timedelta(days=5),
                    session_time="10:00 - 11:00",
                    status="Completed",
                    payment_status="Paid",
                    session_type="VIDEO_CALL",
                    subject="Mathematics - Calculus"
                )
                db.add(past_booking)
                db.commit()
                db.refresh(past_booking)
                print(f"[OK] Created past booking (id={past_booking.id})")

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
                    student_id=student_user.id,
                    tutor_id=tutor_profile.id,
                    rating=5.0,
                    comment="Dr. Sarah is an amazing tutor! She explained calculus concepts very clearly with practical examples. I went from failing to scoring 92% in my exam!"
                )
                db.add(past_review)
                db.commit()
                print("[OK] Created payment + review for past booking")

                # Active upcoming booking
                active_booking = models.Booking(
                    student_id=student_user.id,
                    tutor_id=tutor_profile.id,
                    booking_date=today + datetime.timedelta(days=1),
                    session_time="10:00 - 11:00",
                    status="Accepted",
                    payment_status="Paid",
                    session_type="VIDEO_CALL",
                    subject="Statistics & Probability"
                )
                db.add(active_booking)
                db.commit()
                db.refresh(active_booking)
                print(f"[OK] Created upcoming accepted booking (id={active_booking.id})")
            else:
                print(f"[SKIP] Bookings already exist ({existing_bookings} bookings)")

        # Create welcome notifications
        if student_user:
            notif_count = db.query(models.Notification).filter(models.Notification.user_id == student_user.id).count()
            if notif_count == 0:
                db.add(models.Notification(user_id=student_user.id, message="Welcome to TutorNow! Browse tutors to book your first session.", status="Unread"))
                db.commit()
                print("[OK] Created student notification")

        if tutor_user:
            notif_count = db.query(models.Notification).filter(models.Notification.user_id == tutor_user.id).count()
            if notif_count == 0:
                db.add(models.Notification(user_id=tutor_user.id, message="Welcome to TutorNow! Your tutor profile is approved and visible to students.", status="Unread"))
                db.commit()
                print("[OK] Created tutor notification")

        # Final summary
        total_tutors = db.query(models.Tutor).count()
        total_users = db.query(models.User).count()
        total_bookings = db.query(models.Booking).count()
        print(f"\n=== SEED COMPLETE ===")
        print(f"  Users: {total_users}")
        print(f"  Tutor profiles: {total_tutors}")
        print(f"  Bookings: {total_bookings}")

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_seed()
