from database import SessionLocal
import models
from supabase_sync import pull_initial_data_from_supabase, supabase_client

print("1. Pulling from Supabase Cloud...")
pull_initial_data_from_supabase()

db = SessionLocal()
matches = db.query(models.User).filter(models.User.email.contains("harshitha")).all()
print("Matches found:", [(u.id, u.name, u.email, u.role, u.tutor_profile.status if u.tutor_profile else "No tutor_profile") for u in matches])

if supabase_client:
    try:
        sb_users = supabase_client.table("users").select("*").ilike("email", "%harshitha%").execute()
        print("Supabase users table matches:", sb_users.data)
    except Exception as e:
        print("Supabase query error:", e)
