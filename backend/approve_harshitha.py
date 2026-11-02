from database import SessionLocal
import models
from supabase_sync import supabase_client
import datetime

db = SessionLocal()
u = db.query(models.User).filter(models.User.email == "harshitha123@gmail.com").first()
if u and u.tutor_profile:
    u.tutor_profile.status = "Approved"
    u.tutor_profile.is_verified = True
    u.tutor_profile.approved_at = datetime.datetime.utcnow()
    db.commit()
    print("Local Tutor status set to Approved.")

if supabase_client and u:
    try:
        supabase_client.table("tutors").update({
            "status": "Approved",
            "is_verified": True
        }).eq("user_id", u.id).execute()
        print("Supabase cloud status set to Approved.")
    except Exception as e:
        print("Supabase update notice:", e)
