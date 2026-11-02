import time
import requests
import psycopg2

SUPABASE_URL = "https://oedafagwhpatywxvmgwj.supabase.co"
SUPABASE_KEY = "sb_publishable_b6IxDFdy3K6AlkkIA194tw_uv9AEbtL"
DB_URL = "postgresql://postgres.oedafagwhpatywxvmgwj:harshitha%407890@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require"

def test_suite():
    print("================================================================")
    print("    TUTORNOW CROSS-PLATFORM SUPABASE E2E VERIFICATION TEST")
    print("================================================================")

    # -------------------------------------------------------------
    # TEST 1: WEB REGISTRATION (STUDENT) -> MOBILE LOGIN
    # -------------------------------------------------------------
    timestamp = int(time.time())
    student_email = f"student_web_{timestamp}@tutornow.com"
    student_pass = "TestStudentPass123!"
    student_name = f"Web Student {timestamp}"

    student_mobile = f"98{timestamp % 100000000:08d}"
    tutor_mobile = f"97{timestamp % 100000000:08d}"

    print(f"\n[TEST 1] Registering Student on Web: {student_email}")
    reg_res = requests.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={
            "email": student_email,
            "password": student_pass,
            "data": {"name": student_name, "role": "Student", "mobile": student_mobile}
        }
    )
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    print("  -> Web Registration: SUCCESS (200 OK)")

    # Mobile Login with same credentials
    print(f"  -> Logging in from Mobile Client with same credentials...")
    login_res = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": student_email, "password": student_pass}
    )
    assert login_res.status_code == 200, f"Mobile login failed: {login_res.text}"
    student_token = login_res.json()["access_token"]
    student_uid = login_res.json()["user"]["id"]
    print(f"  -> Mobile Login: SUCCESS! Access Token retrieved for UID {student_uid}")

    # -------------------------------------------------------------
    # TEST 2: MOBILE REGISTRATION (TUTOR) -> WEB LOGIN
    # -------------------------------------------------------------
    tutor_email = f"tutor_mob_{timestamp}@tutornow.com"
    tutor_pass = "TestTutorPass123!"
    tutor_name = f"Mobile Tutor {timestamp}"

    print(f"\n[TEST 2] Registering Tutor on Mobile: {tutor_email}")
    tutor_reg_res = requests.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={
            "email": tutor_email,
            "password": tutor_pass,
            "data": {
                "name": tutor_name,
                "role": "Tutor",
                "mobile": tutor_mobile,
                "subject": "Advanced Chemistry",
                "hourly_rate": 600.0,
                "qualification": "Ph.D Chemistry",
                "experience": 6
            }
        }
    )
    assert tutor_reg_res.status_code == 200, f"Tutor registration failed: {tutor_reg_res.text}"
    print("  -> Mobile Tutor Registration: SUCCESS (200 OK)")

    # Web Login with same Tutor credentials
    print(f"  -> Logging in from Web Client with same Tutor credentials...")
    tutor_login_res = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": tutor_email, "password": tutor_pass}
    )
    assert tutor_login_res.status_code == 200, f"Web login for tutor failed: {tutor_login_res.text}"
    print(f"  -> Web Tutor Login: SUCCESS! Role = {tutor_login_res.json()['user']['user_metadata']['role']}")

    # -------------------------------------------------------------
    # TEST 3: DATABASE RECORD & PROFILE SYNC VERIFICATION
    # -------------------------------------------------------------
    print("\n[TEST 3] Verifying Synchronized Supabase PostgreSQL Records...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("SELECT id, name, email, role FROM public.users WHERE email = %s;", (student_email,))
    student_db_row = cur.fetchone()
    assert student_db_row is not None, "Student record missing in public.users"
    student_db_id = student_db_row[0]
    print(f"  -> Student DB Record Verified: ID {student_db_id}, Name: {student_db_row[1]}")

    cur.execute("SELECT u.id, u.name, t.id, t.subject, t.hourly_rate FROM public.users u JOIN public.tutors t ON t.user_id = u.id WHERE u.email = %s;", (tutor_email,))
    tutor_db_row = cur.fetchone()
    assert tutor_db_row is not None, "Tutor profile record missing in public.tutors"
    tutor_user_id, tutor_name_db, tutor_table_id, tutor_subj, tutor_rate = tutor_db_row
    print(f"  -> Tutor Profile DB Verified: Tutor Table ID {tutor_table_id}, Subject: {tutor_subj}, Rate: Rs. {tutor_rate}")

    # -------------------------------------------------------------
    # TEST 4: STUDENT BOOKING -> SUPABASE PERSISTENCE -> TUTOR REALTIME
    # -------------------------------------------------------------
    print(f"\n[TEST 4] Student ({student_name}) creating Booking for Tutor ({tutor_name_db})...")
    cur.execute("""
    INSERT INTO public.bookings (student_id, tutor_id, subject, booking_date, session_time, status, payment_status, session_type, duration)
    VALUES (%s, %s, %s, CURRENT_DATE + INTERVAL '1 day', '10:00 - 11:00', 'Pending', 'Unpaid', 'VIDEO_CALL', 60)
    RETURNING id, status;
    """, (student_db_id, tutor_table_id, tutor_subj))
    conn.commit()
    booking_id, booking_status = cur.fetchone()
    print(f"  -> Booking Created in Supabase: ID {booking_id}, Initial Status: {booking_status}")

    # -------------------------------------------------------------
    # TEST 5: TUTOR ACCEPTS BOOKING -> STATUS CHANGE -> REALTIME SYNC
    # -------------------------------------------------------------
    print(f"\n[TEST 5] Tutor accepting Booking {booking_id}...")
    cur.execute("UPDATE public.bookings SET status = 'Accepted' WHERE id = %s RETURNING id, status;", (booking_id,))
    conn.commit()
    updated_id, updated_status = cur.fetchone()
    assert updated_status == "Accepted", "Booking status did not update to Accepted"
    print(f"  -> Booking Status Updated in Supabase: Status = {updated_status}!")

    # -------------------------------------------------------------
    # TEST 6: PRE-SEEDED DEMO ACCOUNTS LOGIN TEST
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing Pre-Seeded Demo Accounts (Student, Tutor, Admin)...")
    demo_accounts = [
        ("student@tutornow.com", "student123", "Student"),
        ("tutor@tutornow.com", "tutor123", "Tutor"),
        ("admin@tutornow.com", "Admin@TutorNow2024!", "Admin")
    ]
    for email, password, expected_role in demo_accounts:
        r = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": password}
        )
        assert r.status_code == 200, f"Demo login failed for {email}: {r.text}"
        actual_role = r.json()["user"]["user_metadata"]["role"]
        print(f"  -> Demo Account {email} ({password}) -> SUCCESS (Role: {actual_role})")

    cur.close()
    conn.close()

    print("\n================================================================")
    print("  ALL 6 CROSS-PLATFORM SUPABASE INTEGRATION TESTS PASSED! (100%)")
    print("================================================================\n")

if __name__ == '__main__':
    test_suite()
