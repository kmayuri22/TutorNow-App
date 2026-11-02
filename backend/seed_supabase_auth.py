import psycopg2
import requests

def ensure_demo_accounts():
    conn = psycopg2.connect('postgresql://postgres.oedafagwhpatywxvmgwj:harshitha%407890@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require')
    conn.autocommit = True
    cur = conn.cursor()

    accounts = [
        {'email': 'student@tutornow.com', 'password': 'student123', 'name': 'Alex Smith', 'role': 'Student', 'mobile': '9876543210'},
        {'email': 'tutor@tutornow.com', 'password': 'tutor123', 'name': 'Dr. Sarah Jenkins', 'role': 'Tutor', 'mobile': '9876543211'},
        {'email': 'admin@tutornow.com', 'password': 'Admin@TutorNow2024!', 'name': 'System Admin', 'role': 'Admin', 'mobile': '9876543212'},
        {'email': 'poojitha@gmail.com', 'password': 'student123', 'name': 'Poojitha', 'role': 'Student', 'mobile': '9586243782'},
        {'email': 'mayuri123@gmail.com', 'password': 'tutor123', 'name': 'Mayuri Kosinapalli', 'role': 'Tutor', 'mobile': '7896543290'}
    ]

    for acc in accounts:
        # Delete existing from auth.users if exists to reset password cleanly
        cur.execute("DELETE FROM auth.users WHERE email = %s;", (acc['email'],))
        
        # Signup through Supabase Auth API
        r = requests.post(
            'https://oedafagwhpatywxvmgwj.supabase.co/auth/v1/signup',
            headers={'apikey': 'sb_publishable_b6IxDFdy3K6AlkkIA194tw_uv9AEbtL', 'Content-Type': 'application/json'},
            json={
                'email': acc['email'],
                'password': acc['password'],
                'data': {
                    'name': acc['name'],
                    'role': acc['role'],
                    'mobile': acc['mobile']
                }
            }
        )
        print(f"Provisioned {acc['email']}: Status {r.status_code}")

    cur.close()
    conn.close()
    print("Demo accounts synced!")

if __name__ == '__main__':
    ensure_demo_accounts()
