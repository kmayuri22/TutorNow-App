from database import SessionLocal
import models
from supabase_sync import supabase_client

db = SessionLocal()
u = db.query(models.User).filter(models.User.email == "harshitha123@gmail.com").first()
if u:
    if not u.tutor_profile:
        tp = models.Tutor(
            user_id=u.id,
            subject="Computer Science & Mathematics",
            qualification="B.Tech, Computer Science",
            experience=2,
            hourly_rate=450.0,
            bio="Passionate computer science and math tutor.",
            status="Pending",
            is_verified=False
        )
        db.add(tp)
        db.commit()
        db.refresh(tp)
        print(f"Created Tutor profile for {u.email} with status 'Pending' (Tutor ID: {tp.id})")
    else:
        u.tutor_profile.status = "Pending"
        u.tutor_profile.is_verified = False
        db.commit()
        print(f"Updated Tutor profile for {u.email} to status 'Pending' (Tutor ID: {u.tutor_profile.id})")

    # Also update in Supabase
    if supabase_client:
        try:
            supabase_client.table("tutors").update({"status": "Pending", "is_verified": False}).eq("user_id", u.id).execute()
            print("Updated Supabase status to 'Pending'")
        except Exception as err:
            print("Supabase update error:", err)
