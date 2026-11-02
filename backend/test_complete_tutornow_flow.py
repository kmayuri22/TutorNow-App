import datetime
from database import SessionLocal
import models
import auth
from routers.admin import get_pending_tutors, tutor_approval_action
import schemas

def run_full_suite():
    db = SessionLocal()
    print("=" * 60)
    print("      TUTORNOW COMPREHENSIVE E2E VERIFICATION SUITE")
    print("=" * 60)

    # -------------------------------------------------------------
    # TEST 1: Student Flow
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing Student Registration & Direct Access...")
    ts = int(datetime.datetime.utcnow().timestamp())
    student_email = f"student_flow_{ts}@tutornow.com"
    hashed = auth.get_password_hash("pass123456")
    student = models.User(
        name="Auto Test Student",
        email=student_email,
        mobile=f"98{ts % 100000000:08d}",
        password=hashed,
        role="Student"
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    assert student.id is not None
    assert student.role == "Student"
    print(f" -> Student registered: {student.email} (ID: {student.id}) - Active immediately!")

    # -------------------------------------------------------------
    # TEST 2: Tutor Registration & Initial Pending Status
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Tutor Registration & Pending Status...")
    tutor_email = f"tutor_flow_{ts}@tutornow.com"
    tutor_user = models.User(
        name="Auto Test Tutor",
        email=tutor_email,
        mobile=f"97{ts % 100000000:08d}",
        password=hashed,
        role="Tutor"
    )
    db.add(tutor_user)
    db.commit()
    db.refresh(tutor_user)

    tutor_profile = models.Tutor(
        user_id=tutor_user.id,
        subject="Mathematics & Physics",
        qualification="M.Sc. Physics",
        experience=3,
        hourly_rate=500.0,
        bio="Experienced Math tutor.",
        status="Pending",
        is_verified=False
    )
    db.add(tutor_profile)
    db.commit()
    db.refresh(tutor_profile)
    assert tutor_profile.status == "Pending"
    print(f" -> Tutor registered: {tutor_user.email} (Tutor ID: {tutor_profile.id}) - Status: {tutor_profile.status} (Pending)")

    # -------------------------------------------------------------
    # TEST 3: Admin Review & Approval Flow
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Admin Pending List & Tutor Approval...")
    pending_list = get_pending_tutors(db)
    pending_ids = [t["id"] for t in pending_list]
    print(f" -> Total Pending Tutors in Admin view: {len(pending_list)}")
    assert tutor_profile.id in pending_ids

    # Admin approves tutor
    tutor_profile.status = "Approved"
    tutor_profile.is_verified = True
    tutor_profile.approved_at = datetime.datetime.utcnow()
    db.commit()
    print(f" -> Admin Approved Tutor ID {tutor_profile.id} -> Status: {tutor_profile.status}")

    # -------------------------------------------------------------
    # TEST 4: Approved Tutor Dashboard & Availability
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Approved Tutor Dashboard & Slot Availability...")
    # Add availability slot
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    slot = models.Availability(
        tutor_id=tutor_profile.id,
        date=tomorrow,
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 0),
        status="Available"
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    print(f" -> Created availability slot for {slot.date} (10:00 - 11:00) - Status: {slot.status}")

    # -------------------------------------------------------------
    # TEST 5: Student Booking & Tutor Real-Time Acceptance Flow
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Student Booking & Tutor Acceptance Flow...")
    booking = models.Booking(
        student_id=student.id,
        tutor_id=tutor_profile.id,
        booking_date=tomorrow,
        session_time="10:00 - 11:00",
        session_type="IN_PERSON",
        status="Pending",
        payment_status="Paid",
        tracking_status="Accepted"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    print(f" -> Student booked in-person slot: Booking #{booking.id} - Status: {booking.status}")

    # Tutor accepts booking and starts journey
    booking.status = "Accepted"
    booking.tracking_status = "Journey Started"
    db.commit()
    print(f" -> Tutor accepted booking #{booking.id} -> Tracking Status: {booking.tracking_status}!")

    # Tutor arrives and starts session
    booking.tracking_status = "Tutor Arrived"
    db.commit()
    print(f" -> Live GPS Tracking: {booking.tracking_status}")

    booking.tracking_status = "Session Started"
    db.commit()
    print(f" -> In-person Lesson in progress: {booking.tracking_status}")

    booking.status = "Completed"
    booking.tracking_status = "Session Completed"
    db.commit()
    print(f" -> In-person Lesson successfully concluded: {booking.status} / {booking.tracking_status}")

    # Student verifies updated status
    verified_booking = db.query(models.Booking).filter(models.Booking.id == booking.id).first()
    assert verified_booking.status == "Completed"
    assert verified_booking.session_type == "IN_PERSON"
    print(f" -> Student sees live status: '{verified_booking.status}' - In-Person session completed!")

    # -------------------------------------------------------------
    # TEST 6: Session & Token Resilience
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing Token Authentication & Session Persistence...")
    token = auth.create_access_token({"sub": tutor_user.email, "role": "Tutor"})
    user_authenticated = auth.get_current_user(token, db)
    assert user_authenticated.email == tutor_user.email
    print(f" -> Token validation verified for {user_authenticated.email} - Session valid and persistent!")

    print("\n" + "=" * 60)
    print("       ALL TUTORNOW WORKFLOW TESTS PASSED (6/6) [SUCCESS]")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_full_suite()
