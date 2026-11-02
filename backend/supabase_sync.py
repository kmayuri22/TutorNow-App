import os
import datetime
from dotenv import load_dotenv
from sqlalchemy import event
from supabase import create_client, Client
import models
from database import SessionLocal

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase_client: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[SUPABASE] Supabase HTTPS Synchronizer initialized successfully.")
    except Exception as err:
        print(f"[SUPABASE ERROR] Failed to initialize Supabase client: {err}")

def serialize_model_data(target):
    """Converts a model instance into a dictionary suitable for Supabase upserts."""
    data = {}
    for col in target.__table__.columns:
        val = getattr(target, col.name)
        if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
            val = val.isoformat()
        data[col.name] = val
    return data

def _on_after_insert_or_update(mapper, connection, target):
    if not supabase_client:
        return
    table_name = target.__tablename__
    data = serialize_model_data(target)
    try:
        if table_name in ["payments", "video_sessions"] and "booking_id" in data:
            supabase_client.table(table_name).upsert(data, on_conflict="booking_id").execute()
        elif table_name == "users" and "email" in data:
            supabase_client.table(table_name).upsert(data, on_conflict="email").execute()
        else:
            supabase_client.table(table_name).upsert(data, on_conflict="id").execute()
        print(f"[SUPABASE SYNC] Upserted {table_name} (ID: {data.get('id')}) to Supabase.")
    except Exception as e:
        print(f"[SUPABASE ERROR] Failed to upsert {table_name} to Supabase: {e}")

def _on_after_delete(mapper, connection, target):
    if not supabase_client:
        return
    table_name = target.__tablename__
    record_id = getattr(target, "id", None)
    if record_id is not None:
        try:
            supabase_client.table(table_name).delete().eq("id", record_id).execute()
            print(f"[SUPABASE SYNC] Deleted {table_name} (ID: {record_id}) from Supabase.")
        except Exception as e:
            print(f"[SUPABASE ERROR] Failed to delete {table_name} from Supabase: {e}")

def register_supabase_listeners():
    """Attaches SQLAlchemy event listeners to sync every local database change to Supabase Cloud."""
    if not supabase_client:
        print("[SUPABASE WARN] Supabase client not initialized. Cannot attach sync listeners.")
        return

    target_models = [
        models.User,
        models.Tutor,
        models.TutorDocument,
        models.Availability,
        models.Booking,
        models.Payment,
        models.Review,
        models.Notification,
        models.TutorLocation,
        models.LiveTracking,
        models.VideoSession,
    ]

    for model_cls in target_models:
        event.listen(model_cls, 'after_insert', _on_after_insert_or_update)
        event.listen(model_cls, 'after_update', _on_after_insert_or_update)
        event.listen(model_cls, 'after_delete', _on_after_delete)

    print("[SUPABASE] Real-time event listeners attached to all database models for bidirectional cloud sync.")

def pull_initial_data_from_supabase():
    """Initializes local state from Supabase Cloud on server startup."""
    if not supabase_client:
        return

    print("[SUPABASE] Pulling initial data from Supabase Cloud...")
    db = SessionLocal()
    try:
        # 1. Pull Users
        res_users = supabase_client.table("users").select("*").execute()
        if res_users.data:
            for row in res_users.data:
                existing = db.query(models.User).filter(
                    (models.User.id == row.get("id")) | (models.User.email == row.get("email"))
                ).first()
                if not existing:
                    user = models.User(
                        id=row.get("id"),
                        name=row.get("name"),
                        email=row.get("email"),
                        mobile=row.get("mobile"),
                        password=row.get("password"),
                        role=row.get("role", "Student"),
                        is_suspended=row.get("is_suspended", False)
                    )
                    db.add(user)
                else:
                    existing.name = row.get("name", existing.name)
                    existing.email = row.get("email", existing.email)
                    existing.mobile = row.get("mobile", existing.mobile)
                    existing.role = row.get("role", existing.role)
                    if row.get("password"):
                        existing.password = row.get("password")
            db.commit()
            print(f"[SUPABASE] Synced {len(res_users.data)} users from Supabase.")

        # 2. Pull Tutors
        res_tutors = supabase_client.table("tutors").select("*").execute()
        if res_tutors.data:
            for row in res_tutors.data:
                existing = db.query(models.Tutor).filter(models.Tutor.id == row["id"]).first()
                if not existing:
                    tutor = models.Tutor(
                        id=row.get("id"),
                        user_id=row.get("user_id"),
                        subject=row.get("subject", ""),
                        qualification=row.get("qualification", ""),
                        specialization=row.get("specialization"),
                        experience=row.get("experience", 0),
                        hourly_rate=row.get("hourly_rate", 0.0),
                        bio=row.get("bio"),
                        rating=row.get("rating", 0.0),
                        status=row.get("status", "Approved")
                    )
                    db.add(tutor)
                else:
                    existing.user_id = row.get("user_id", existing.user_id)
                    existing.subject = row.get("subject", existing.subject)
                    existing.qualification = row.get("qualification", existing.qualification)
                    existing.hourly_rate = row.get("hourly_rate", existing.hourly_rate)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_tutors.data)} tutors from Supabase.")

        # 3. Pull Bookings
        res_bookings = supabase_client.table("bookings").select("*").execute()
        if res_bookings.data:
            for row in res_bookings.data:
                existing = db.query(models.Booking).filter(models.Booking.id == row["id"]).first()
                b_date = row.get("booking_date")
                if isinstance(b_date, str):
                    try:
                        b_date = datetime.datetime.strptime(b_date, "%Y-%m-%d").date()
                    except ValueError:
                        b_date = datetime.date.today()

                if not existing:
                    booking = models.Booking(
                        id=row.get("id"),
                        student_id=row.get("student_id"),
                        tutor_id=row.get("tutor_id"),
                        booking_date=b_date,
                        session_time=row.get("session_time"),
                        status=row.get("status", "Pending"),
                        payment_status=row.get("payment_status", "Unpaid"),
                        session_type=row.get("session_type", "IN_PERSON"),
                        subject=row.get("subject"),
                        duration=row.get("duration", 60),
                        notes=row.get("notes")
                    )
                    db.add(booking)
                else:
                    existing.student_id = row.get("student_id", existing.student_id)
                    existing.tutor_id = row.get("tutor_id", existing.tutor_id)
                    existing.booking_date = b_date
                    existing.session_time = row.get("session_time", existing.session_time)
                    existing.session_type = row.get("session_type", existing.session_type)
                    existing.subject = row.get("subject", existing.subject)
                    existing.status = row.get("status", existing.status)
                    existing.payment_status = row.get("payment_status", existing.payment_status)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_bookings.data)} bookings from Supabase.")

        # 4. Pull Availability
        res_avail = supabase_client.table("availability").select("*").execute()
        if res_avail.data:
            for row in res_avail.data:
                existing = db.query(models.Availability).filter(models.Availability.id == row["id"]).first()
                if not existing:
                    a_date = row.get("date")
                    if isinstance(a_date, str):
                        try:
                            a_date = datetime.datetime.strptime(a_date, "%Y-%m-%d").date()
                        except ValueError:
                            a_date = datetime.date.today()
                    s_time = row.get("start_time")
                    if isinstance(s_time, str):
                        try:
                            s_time = datetime.datetime.strptime(s_time[:5], "%H:%M").time()
                        except ValueError:
                            s_time = datetime.time(9, 0)
                    e_time = row.get("end_time")
                    if isinstance(e_time, str):
                        try:
                            e_time = datetime.datetime.strptime(e_time[:5], "%H:%M").time()
                        except ValueError:
                            e_time = datetime.time(10, 0)

                    avail = models.Availability(
                        id=row.get("id"),
                        tutor_id=row.get("tutor_id"),
                        date=a_date,
                        start_time=s_time,
                        end_time=e_time,
                        status=row.get("status", "Available")
                    )
                    db.add(avail)
                else:
                    existing.tutor_id = row.get("tutor_id", existing.tutor_id)
                    existing.status = row.get("status", existing.status)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_avail.data)} availability slots from Supabase.")

        # 5. Pull Payments
        res_payments = supabase_client.table("payments").select("*").execute()
        if res_payments.data:
            for row in res_payments.data:
                existing = db.query(models.Payment).filter(models.Payment.id == row["id"]).first()
                if not existing:
                    pmt = models.Payment(
                        id=row.get("id"),
                        booking_id=row.get("booking_id"),
                        amount=row.get("amount", 0.0),
                        payment_method=row.get("payment_method", "UPI"),
                        transaction_id=row.get("transaction_id"),
                        status=row.get("status", "Success")
                    )
                    db.add(pmt)
                else:
                    existing.booking_id = row.get("booking_id", existing.booking_id)
                    existing.status = row.get("status", existing.status)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_payments.data)} payments from Supabase.")

        # 6. Pull Reviews
        res_reviews = supabase_client.table("reviews").select("*").execute()
        if res_reviews.data:
            for row in res_reviews.data:
                existing = db.query(models.Review).filter(models.Review.id == row["id"]).first()
                if not existing:
                    rev = models.Review(
                        id=row.get("id"),
                        student_id=row.get("student_id"),
                        tutor_id=row.get("tutor_id"),
                        rating=row.get("rating", 5.0),
                        comment=row.get("comment", "")
                    )
                    db.add(rev)
                else:
                    existing.student_id = row.get("student_id", existing.student_id)
                    existing.tutor_id = row.get("tutor_id", existing.tutor_id)
                    existing.rating = row.get("rating", existing.rating)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_reviews.data)} reviews from Supabase.")

        # 7. Pull Notifications
        res_notifs = supabase_client.table("notifications").select("*").execute()
        if res_notifs.data:
            for row in res_notifs.data:
                existing = db.query(models.Notification).filter(models.Notification.id == row["id"]).first()
                if not existing:
                    notif = models.Notification(
                        id=row.get("id"),
                        user_id=row.get("user_id"),
                        message=row.get("message", ""),
                        status=row.get("status", "Unread")
                    )
                    db.add(notif)
                else:
                    existing.user_id = row.get("user_id", existing.user_id)
                    existing.status = row.get("status", existing.status)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_notifs.data)} notifications from Supabase.")

        # 8. Pull UserSessions
        res_sessions = supabase_client.table("user_sessions").select("*").execute()
        if res_sessions.data:
            for row in res_sessions.data:
                existing = db.query(models.UserSession).filter(models.UserSession.id == row["id"]).first()
                if not existing:
                    exp_dt = row.get("expires_at")
                    if isinstance(exp_dt, str):
                        try:
                            exp_dt = datetime.datetime.fromisoformat(exp_dt.replace("Z", "+00:00"))
                        except Exception:
                            exp_dt = datetime.datetime.utcnow() + datetime.timedelta(days=1)
                    us = models.UserSession(
                        id=row.get("id"),
                        user_id=row.get("user_id"),
                        token_jti=row.get("token_jti"),
                        expires_at=exp_dt,
                        invalidated=row.get("invalidated", False)
                    )
                    db.add(us)
                else:
                    existing.invalidated = row.get("invalidated", existing.invalidated)
            db.commit()
            print(f"[SUPABASE] Synced {len(res_sessions.data)} user sessions from Supabase.")

    except Exception as e:
        print(f"[SUPABASE WARN] Could not pull initial data from Supabase: {e}")
    finally:
        db.close()
