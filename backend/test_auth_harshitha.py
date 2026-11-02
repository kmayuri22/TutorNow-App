from database import SessionLocal
import models
from auth import create_access_token, get_current_user

db = SessionLocal()
token = create_access_token({"sub": "harshitha123@gmail.com", "role": "Tutor"})
user = get_current_user(token, db)
print("SUCCESS: Validated user:", user.name, user.email, user.role, "Tutor Status:", user.tutor_profile.status if user.tutor_profile else None)
