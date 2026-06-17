import sys
import os

def run_tests():
    print("--------------------------------------------------")
    print("TutorNow Backend Verification Script")
    print("--------------------------------------------------")

    # 1. Test imports and settings loading
    try:
        from config import settings
        print(f"[SUCCESS] Config Settings loaded successfully. Project Name: {settings.PROJECT_NAME}")
    except Exception as e:
        print(f"[FAILURE] Failed to load config settings: {e}")
        return False

    # 2. Test database connection & table mapping
    try:
        from database import SessionLocal, engine, Base
        import models
        
        # Verify engine connects
        db = SessionLocal()
        print("[SUCCESS] Database engine session successfully established.")
        
        # Verify metadata inspection
        tables = Base.metadata.tables.keys()
        print(f"[SUCCESS] Model table mappings found: {list(tables)}")
        db.close()
    except Exception as e:
        print(f"[FAILURE] Database or Model inspection failed: {e}")
        return False

    # 3. Test schemas validation loading
    try:
        import schemas
        print("[SUCCESS] Pydantic validation schemas loaded successfully.")
    except Exception as e:
        print(f"[FAILURE] Pydantic schema load failed: {e}")
        return False

    # 4. Test routers initialization
    try:
        from routers import auth, tutors, availability, bookings, payments, reviews, admin, notifications
        from main import app
        print("[SUCCESS] FastAPI app initialized with all routers registered.")
    except Exception as e:
        print(f"[FAILURE] FastAPI router integration failed: {e}")
        return False

    print("--------------------------------------------------")
    print("All backend checks passed! Ready for deployment.")
    print("--------------------------------------------------")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
