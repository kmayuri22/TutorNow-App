import psycopg2

def run_migrations():
    conn = psycopg2.connect('postgresql://postgres.oedafagwhpatywxvmgwj:harshitha%407890@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require')
    conn.autocommit = True
    cur = conn.cursor()

    print("Connected to Supabase PostgreSQL...")

    # 1. Update any existing unconfirmed users and reset sequences
    cur.execute("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;")
    
    # Sync all table sequences
    for table in ['users', 'tutors', 'bookings', 'payments', 'reviews', 'notifications', 'availability']:
        try:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false);")
        except Exception as e:
            print(f"Sequence sync notice for {table}: {e}")
    print("Auto-confirmed existing auth.users and reset table sequences.")

    # 2. Check and ensure unique constraint on public.users(email) and default for rating
    cur.execute("""
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
    ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    ALTER TABLE public.tutors ALTER COLUMN rating SET DEFAULT 0.0;
    """)
    print("Ensured constraints and defaults on users and tutors.")

    # 3. Create or replace trigger function
    trigger_sql = """
    CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
    RETURNS TRIGGER AS $$
    DECLARE
      v_role text;
      v_name text;
      v_mobile text;
      v_user_id int;
    BEGIN
      -- Auto-confirm email
      NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());

      v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Student');
      v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
      v_mobile := COALESCE(NEW.raw_user_meta_data->>'mobile', '');

      -- Insert into public.users if not exists
      INSERT INTO public.users (name, email, password, role, mobile, created_at)
      VALUES (v_name, NEW.email, '', v_role, v_mobile, NOW())
      ON CONFLICT (email) DO UPDATE 
        SET name = EXCLUDED.name,
            role = EXCLUDED.role,
            mobile = EXCLUDED.mobile
      RETURNING id INTO v_user_id;

      -- If Tutor, insert into public.tutors
      IF v_role = 'Tutor' THEN
        INSERT INTO public.tutors (
          user_id, 
          subject, 
          qualification, 
          experience, 
          hourly_rate, 
          rating,
          bio, 
          teaching_mode,
          location_city,
          status, 
          is_online, 
          is_verified
        )
        VALUES (
          v_user_id,
          COALESCE(NEW.raw_user_meta_data->>'subject', 'General Tutoring'),
          COALESCE(NEW.raw_user_meta_data->>'qualification', 'Degree'),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'experience', '')::int, 1),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'hourly_rate', '')::float, 300.0),
          0.0,
          COALESCE(NEW.raw_user_meta_data->>'bio', ''),
          COALESCE(NEW.raw_user_meta_data->>'teaching_mode', 'Both'),
          COALESCE(NEW.raw_user_meta_data->>'location_city', 'Online'),
          'Approved',
          true,
          true
        )
        ON CONFLICT (user_id) DO NOTHING;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """
    cur.execute(trigger_sql)
    print("Created trigger function handle_new_auth_user.")

    # 4. Attach trigger to auth.users before insert
    cur.execute("""
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      BEFORE INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
    """)
    print("Attached trigger on_auth_user_created to auth.users.")

    # 5. Enable Realtime on key tables in publication supabase_realtime
    cur.execute("""
    DO $$
    BEGIN
      BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings, public.notifications, public.tutors, public.users;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Tables already in supabase_realtime publication';
        WHEN undefined_object THEN
          CREATE PUBLICATION supabase_realtime FOR TABLE public.bookings, public.notifications, public.tutors, public.users;
      END;
    END $$;
    """)
    print("Configured Supabase Realtime publication.")

    cur.close()
    conn.close()
    print("All Supabase migrations completed successfully!")

if __name__ == '__main__':
    run_migrations()
