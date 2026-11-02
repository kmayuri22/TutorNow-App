import psycopg2

conn = psycopg2.connect('postgresql://postgres.oedafagwhpatywxvmgwj:harshitha%407890@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()

print("--- TUTORS COLUMNS ---")
cur.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tutors' ORDER BY ordinal_position;")
for col in cur.fetchall():
    print(col)

print("\n--- CONSTRAINTS ON TUTORS ---")
cur.execute("""
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.tutors'::regclass;
""")
for con in cur.fetchall():
    print(con)

cur.close()
conn.close()
