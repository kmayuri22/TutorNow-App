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

    # Convert "postgres://" to "postgresql://" if needed (for Heroku/Render)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

settings = Settings()
