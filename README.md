# TutorNow - Real-Time On-Demand Tutor Booking Platform

TutorNow is a full-stack educational web application designed to connect students with verified expert tutors in real-time. Students can search/filter tutors, request lessons, checkout securely via a mock payment portal, submit ratings, and communicate slots dynamically. Tutors can set active hours, accept/reject requests, and review dashboards, while administrators verify profiles and audit transactions.

---

## Repository Structure

```
TutorNow/
├── frontend/             # Next.js (TypeScript, Tailwind, Zustand, React-Hook-Form)
│   ├── package.json      # Dependencies (Next.js 15, React 19, Zustand, Axios, Zod)
│   └── src/              # Application source code
├── backend/              # FastAPI Python Web Services
│   ├── main.py           # Application entrypoint & WebSockets handler
│   ├── seed.py           # Database seeder (Student, Tutor, Admin, past lessons)
│   └── requirements.txt  # Python requirements (FastAPI, SQLAlchemy, PyJWT, Passlib)
└── docs/                 # Detailed documentation guides
    ├── INSTALLATION.md   # Setup and startup guide
    ├── ENV_VARIABLES.md  # Configuration parameters guide
    ├── DATABASE_SETUP.md # SQL database connections, schema details and seeding
    └── API_DOCUMENTATION.md # REST API endpoint contracts
```

---

## Tech Stack Overview

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Axios, React Hook Form, Zod.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, SQLite/PostgreSQL, JWT Security, Bcrypt hashing, WebSockets.

---

## Detailed Documentation Indexes

1. **[Installation Guide](file:///c:/Users/venkataramana/OneDrive/Desktop/TutorWebAPP/docs/INSTALLATION.md)**: Steps to run the frontend next server and the backend fastapi worker.
2. **[Environment Variables](file:///c:/Users/venkataramana/OneDrive/Desktop/TutorWebAPP/docs/ENV_VARIABLES.md)**: Configuration keys for security credentials and DB connections.
3. **[Database Setup & Seeding](file:///c:/Users/venkataramana/OneDrive/Desktop/TutorWebAPP/docs/DATABASE_SETUP.md)**: Database schemas, structure mapping, and seeding steps.
4. **[API Contracts](file:///c:/Users/venkataramana/OneDrive/Desktop/TutorWebAPP/docs/API_DOCUMENTATION.md)**: Detailed breakdown of JWT auth, tutor searching, bookings, payments, and reviews endpoints.
