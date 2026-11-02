import requests
import datetime
import time

BASE_URL = "http://127.0.0.1:8000"

def test_all():
    print("--- STARTING FUNCTIONAL TESTS ---")

    # 1. Register student
    ts = int(time.time())
    student_email = f"teststudent_{ts}@example.com"
    password = "StudentPassword123!"
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test Student",
        "email": student_email,
        "password": password,
        "role": "Student",
        "mobile": f"9{ts}"[:10]
    })
    assert reg_resp.status_code == 201, f"Reg failed: {reg_resp.text}"
    print("[PASS] TEST 1a: Registration successful")

    # Login student
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": student_email,
        "password": password
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    print("[PASS] TEST 1b: Login successful")

    # Logout student
    logout_resp = requests.post(
        f"{BASE_URL}/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert logout_resp.status_code == 200
    print("[PASS] TEST 1c: Logout successful")

    # Re-login student (TEST 2)
    relogin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": student_email,
        "password": password
    })
    assert relogin_resp.status_code == 200
    student_token = relogin_resp.json()["access_token"]
    print("[PASS] TEST 2: Re-login from another session successful")

    # 2. Register fresh Tutor
    tutor_email = f"testtutor_{ts}@example.com"
    t_reg = requests.post(f"{BASE_URL}/api/auth/register/tutor", json={
        "name": "Test Tutor",
        "email": tutor_email,
        "password": password,
        "mobile": f"8{ts}"[:10],
        "subject": "Mathematics",
        "qualification": "M.Sc Maths",
        "experience": 5,
        "hourly_rate": 50.0
    })
    assert t_reg.status_code == 201, f"Tutor reg failed: {t_reg.text}"
    tutor_user_id = t_reg.json()["id"]

    # Login as Admin and Approve tutor via API
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@tutornow.com",
        "password": "Admin@TutorNow2024!"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]

    # Get pending tutors to find tutor_id
    pending_resp = requests.get(
        f"{BASE_URL}/api/admin/tutors/pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert pending_resp.status_code == 200
    pending_tutors = pending_resp.json()
    tutor_entry = next((t for t in pending_tutors if t["user_id"] == tutor_user_id), None)
    assert tutor_entry is not None, "Pending tutor not found in admin list"
    tutor_id = tutor_entry["id"]

    # Approve tutor
    approve_resp = requests.put(
        f"{BASE_URL}/api/admin/tutors/{tutor_id}/action",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "approve"}
    )
    assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"

    # 3. Tutor Login & Online Status
    tutor_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": tutor_email,
        "password": password
    })
    assert tutor_login.status_code == 200, f"Tutor login failed: {tutor_login.text}"
    tutor_token = tutor_login.json()["access_token"]

    # Check tutor details from student perspective (TEST 3)
    tutor_details = requests.get(f"{BASE_URL}/api/tutors/{tutor_id}").json()
    assert tutor_details["is_online"] == True, f"Expected online, got: {tutor_details['is_online']}"
    print("[PASS] TEST 3: Tutor login sets Tutor Online for Students")

    # TEST 4: Tutor logout -> Tutor Offline
    tutor_logout = requests.post(
        f"{BASE_URL}/api/auth/logout",
        headers={"Authorization": f"Bearer {tutor_token}"}
    )
    assert tutor_logout.status_code == 200
    tutor_details_after = requests.get(f"{BASE_URL}/api/tutors/{tutor_id}").json()
    assert tutor_details_after["is_online"] == False
    print("[PASS] TEST 4: Tutor logout sets Tutor Offline")

    # TEST 6: Book future session while tutor is offline
    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    booking_resp = requests.post(
        f"{BASE_URL}/api/bookings",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "tutor_id": tutor_id,
            "booking_date": tomorrow,
            "session_time": "14:00 - 15:00",
            "session_type": "VIDEO_CALL"
        }
    )
    assert booking_resp.status_code == 201, f"Booking failed: {booking_resp.text}"
    booking_id = booking_resp.json()["id"]
    print("[PASS] TEST 6: Student books future online session while tutor is offline")

    # TEST 9: Try accessing video session URL before scheduled start time -> backend rejects
    video_access = requests.get(
        f"{BASE_URL}/api/video/{booking_id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert video_access.status_code == 400, f"Expected 400 early access rejection, got {video_access.status_code}"
    print(f"[PASS] TEST 9: Early video access rejected with: {video_access.json()['detail']}")

    # TEST 10: Try booking a past date/time -> reject
    past_date = (datetime.date.today() - datetime.timedelta(days=2)).strftime("%Y-%m-%d")
    past_booking = requests.post(
        f"{BASE_URL}/api/bookings",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "tutor_id": tutor_id,
            "booking_date": past_date,
            "session_time": "14:00 - 15:00",
            "session_type": "VIDEO_CALL"
        }
    )
    assert past_booking.status_code == 400, f"Expected 400 past date rejection, got {past_booking.status_code}"
    print(f"[PASS] TEST 10: Past date booking rejected with: {past_booking.json()['detail']}")

    # TEST 11: Try booking an already occupied slot -> reject
    dup_booking = requests.post(
        f"{BASE_URL}/api/bookings",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "tutor_id": tutor_id,
            "booking_date": tomorrow,
            "session_time": "14:00 - 15:00",
            "session_type": "VIDEO_CALL"
        }
    )
    assert dup_booking.status_code == 400, f"Expected 400 conflict rejection, got {dup_booking.status_code}"
    print(f"[PASS] TEST 11: Duplicate slot booking rejected with: {dup_booking.json()['detail']}")

    print("\nALL FUNCTIONAL BACKEND TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_all()
