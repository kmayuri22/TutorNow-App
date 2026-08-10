from database import SessionLocal
import models
import auth

db = SessionLocal()
admin = db.query(models.User).filter(models.User.role == "Admin").first()
if admin:
    print(f"Admin Email: {admin.email}")
    p1 = auth.verify_password("Admin@TutorNow2024!", admin.password)
    p2 = auth.verify_password("admin123", admin.password)
    print(f"Match 'Admin@TutorNow2024!': {p1}")
    print(f"Match 'admin123': {p2}")
db.close()
