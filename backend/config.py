import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

class Settings:
    PROJECT_NAME: str = "TutorNow"
    PROJECT_VERSION: str = "1.0.0"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-tutornow-jwt-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours

    # Database
    # Support postgresql:// or sqlite:///
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./tutornow.db"
    )

    # Convert "postgres://" to "postgresql://" if needed (for Heroku/Render/Supabase)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Supabase credentials (for Storage, Auth or direct SDK usage)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # SMTP / Email Configuration (for OTP delivery)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "noreply@tutornow.com"))

settings = Settings()

