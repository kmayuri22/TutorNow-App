# API Documentation

The TutorNow REST API is built on FastAPI. It contains JWT session security and role validation.

Interactive OpenAPI Documentation is available at: **`http://localhost:8000/docs`**

---

## 1. Authentication APIs (`/api/auth`)

### Register Account
- **Path**: `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "name": "Alex Smith",
    "email": "student@tutornow.com",
    "password": "student123",
    "role": "Student"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "id": 1,
    "name": "Alex Smith",
    "email": "student@tutornow.com",
    "role": "Student",
    "created_at": "2026-06-16T13:00:00"
  }
  ```

### Log In (JSON)
- **Path**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "student@tutornow.com",
    "password": "student123"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "role": "Student",
    "name": "Alex Smith",
    "email": "student@tutornow.com",
    "user_id": 1
  }
  ```

### Get Profile
- **Path**: `GET /api/auth/profile`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response** (200 OK):
  - Returns user details. If the user is a `Tutor`, includes a `tutor_details` object containing biography, rate, and verification status.

---

## 2. Tutor APIs (`/api/tutors`)

### Search Tutors
- **Path**: `GET /api/tutors`
- **Query Parameters**:
  - `subject` (string, optional)
  - `qualification` (string, optional)
  - `min_experience` (integer, optional)
  - `min_rating` (float, optional)
  - `max_price` (float, optional)
- **Response** (200 OK):
  - Array of Tutor profiles matching criteria.

### Get Tutor Details
- **Path**: `GET /api/tutors/{tutor_id}`
- **Response** (200 OK):
  - Returns detailed info of tutor, active availability slots, and student reviews.

---

## 3. Availability APIs (`/api/availability`)

### Add Availability Slot
- **Path**: `POST /api/availability`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>` (Tutors only)
- **Request Body**:
  ```json
  {
    "date": "2026-06-17",
    "start_time": "14:00:00",
    "end_time": "15:00:00"
  }
  ```
- **Response** (201 Created):
  - Returns the created Availability slot details.

---

## 4. Booking APIs (`/api/bookings`)

### Create Booking Request
- **Path**: `POST /api/bookings`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>` (Students only)
- **Request Body**:
  ```json
  {
    "tutor_id": 1,
    "booking_date": "2026-06-17",
    "session_time": "14:00 - 15:00"
  }
  ```
- **Response** (201 Created):
  - Returns created booking log with status `"Pending"`.

### Accept Booking
- **Path**: `PUT /api/bookings/{booking_id}/accept`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>` (Tutors only)
- **Response** (200 OK):
  - Transitions booking status to `"Accepted"`. Sends real-time WebSocket notification to student.

---

## 5. Payment APIs (`/api/payments`)

### Process Payment
- **Path**: `POST /api/payments`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>` (Students only)
- **Request Body**:
  ```json
  {
    "booking_id": 1,
    "payment_method": "Credit Card",
    "amount": 45.0
  }
  ```
- **Response** (201 Created):
  - Returns payment receipt with status `"Success"` and generated `transaction_id`. Sets booking payment status to `"Paid"`.

---

## 6. Review APIs (`/api/reviews`)

### Post Review
- **Path**: `POST /api/reviews`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>` (Students only)
- **Request Body**:
  ```json
  {
    "tutor_id": 1,
    "rating": 5.0,
    "comment": "Outstanding session!"
  }
  ```
- **Response** (201 Created):
  - Creates the review record and recalculates tutor average ratings.
