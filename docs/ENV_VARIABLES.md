# Environment Variables Guide

TutorNow handles app settings via dotenv variables. In development, defaults are automatically used (SQLite DB and local JWT secrets), but you can customize them by creating a `.env` file in the `backend/` directory.

---

## Configuration Keys

Create a `.env` file inside the `backend/` folder and customize these values:

```env
# ----------------------------------------
# SECURITY CONFIGURATION
# ----------------------------------------
# A secure randomly-generated string to encrypt JWT tokens (Change in production)
SECRET_KEY=super-secret-tutornow-jwt-key-change-in-production

# Expiration lifetime of authentication tokens (default is 1440 mins = 24 hours)
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ----------------------------------------
# DATABASE CONFIGURATION
# ----------------------------------------
# SQLite Connection URL (Local Development Default)
DATABASE_URL=sqlite:///./tutornow.db

# Example: PostgreSQL Connection URL (Production Deployment Setup)
# DATABASE_URL=postgresql://username:password@localhost:5432/tutornow
```

---

## SQLite vs PostgreSQL Toggle

SQLAlchemy is configured in `database.py` to support both engines out-of-the-box:
- If `DATABASE_URL` contains `sqlite`, the engine automatically appends SQLite thread constraints (`connect_args={"check_same_thread": False}`).
- If `DATABASE_URL` contains `postgresql`, it establishes standard Postgres connection pools.
- If the connection URL starts with `postgres://`, the code automatically adjusts it to `postgresql://` to ensure compatibility with deployment targets like Heroku or Render.
