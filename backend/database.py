import sys
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

def create_db_engine(url: str):
    engine_kwargs = {}
    if url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10
        engine_kwargs["pool_recycle"] = 300
        engine_kwargs["connect_args"] = {"connect_timeout": 3}
    return create_engine(url, **engine_kwargs)

def get_working_engine():
    primary_url = settings.DATABASE_URL
    if not primary_url.startswith("sqlite"):
        try:
            test_engine = create_db_engine(primary_url)
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[DATABASE] Connected successfully to primary database ({primary_url.split('@')[-1] if '@' in primary_url else primary_url})")
            return test_engine
        except Exception as err:
            print(f"[WARN] Primary database connection failed: {err}")
            print("[INFO] Falling back to local SQLite database (tutornow.db).")

    sqlite_engine = create_db_engine("sqlite:///./tutornow.db")
    print("[DATABASE] Using local SQLite database (tutornow.db).")
    return sqlite_engine

engine = get_working_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass


