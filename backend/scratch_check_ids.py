import sqlite3
import os
from dotenv import load_dotenv
from supabase import create_client

conn = sqlite3.connect('tutornow.db')
c = conn.cursor()
print("--- SQLITE ---")
for r in c.execute('SELECT u.id, u.name, u.email, t.id, t.user_id FROM users u LEFT JOIN tutors t ON t.user_id = u.id WHERE u.name LIKE "%Madhavi%"'):
    print('User ID:', r[0], 'Name:', r[1], 'Email:', r[2], 'Tutor ID:', r[3])

load_dotenv()
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
print("\n--- SUPABASE ---")
u_res = sb.table('users').select('*').ilike('name', '%Madhavi%').execute()
print("Supabase Users:", u_res.data)
t_res = sb.table('tutors').select('*').execute()
for t in t_res.data:
    if any(u['id'] == t.get('user_id') for u in u_res.data):
        print("Supabase Tutor:", t)
