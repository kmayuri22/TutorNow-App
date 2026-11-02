import psycopg2

conn = psycopg2.connect('postgresql://postgres.oedafagwhpatywxvmgwj:harshitha%407890@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()
cur.execute("""
SELECT u.id, u.name, u.email, u.role, t.subject, t.hourly_rate, t.is_online, t.status 
FROM public.users u 
LEFT JOIN public.tutors t ON t.user_id = u.id 
WHERE u.email = 'test_tutor_flow@tutornow.com';
""")
rows = cur.fetchall()
print("Synchronized record in Supabase:", rows)
cur.close()
conn.close()
