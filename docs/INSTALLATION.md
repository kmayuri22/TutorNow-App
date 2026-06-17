# Installation Guide

Follow these instructions to configure and execute both applications locally.

## Prerequisites

Ensure you have the following installed on your operating system:
- **Node.js** (v18.x or above)
- **Python** (v3.10 or above)
- **Pip** (Python package installer)

---

## 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create a Python Virtual Environment:
   ```bash
   python -m venv venv
   ```

3. Activate the Virtual Environment:
   - **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

5. Seed the database (Creates the tables and populates demo users and booking data):
   ```bash
   python seed.py
   ```

6. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will boot on `http://localhost:8000`. The interactive API documentation will be available at `http://localhost:8000/docs`.*

---

## 2. Frontend Setup (Next.js)

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install the Node modules:
   ```bash
   npm install
   ```

3. Start the Next.js local development server:
   ```bash
   npm run dev
   ```
   *The frontend application will load on `http://localhost:3000`.*

---

## 3. Ready-To-Use Seed Accounts

Use these credentials to instantly log in and evaluate the dashboard layouts:

| Role | Email Address | Password | Description |
| :--- | :--- | :--- | :--- |
| **Student** | `student@tutornow.com` | `student123` | Can search tutors, book mathematical slots, pay invoice bills, review tutors. |
| **Tutor** | `tutor@tutornow.com` | `tutor123` | Dr. Sarah Jenkins. Can manage availability slots, approve bookings, review earnings chart. |
| **Admin** | `admin@tutornow.com` | `admin123` | Can toggles verified badges for tutors, suspend accounts, and view overall report metrics. |
