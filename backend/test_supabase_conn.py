import os
import sys
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
db_url = os.getenv("DATABASE_URL")
print(f"URL: {url}", flush=True)
print(f"KEY: {key[:25] if key else None}...", flush=True)
print(f"DB_URL: {db_url}", flush=True)

import requests
try:
    print("\n--- Testing Supabase HTTPS REST API ---", flush=True)
    r = requests.get(f"{url}/rest/v1/users?select=*", headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=5)
    print(f"Status Code: {r.status_code}", flush=True)
    print(f"Response: {r.text[:300]}", flush=True)
except Exception as e:
    print(f"REST error: {e}", flush=True)

try:
    print("\n--- Testing Supabase Storage API ---", flush=True)
    r_store = requests.get(f"{url}/storage/v1/bucket", headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=5)
    print(f"Storage Status: {r_store.status_code}", flush=True)
    print(f"Buckets: {r_store.text}", flush=True)
except Exception as e:
    print(f"Storage error: {e}", flush=True)

import socket
print("\n--- Testing TCP Port connectivity to Supabase Host ---", flush=True)
for host in ["aws-0-ap-northeast-2.pooler.supabase.com", "db.oedafagwhpatywxvmgwj.supabase.co"]:
    for port in [5432, 6543]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(4)
        result = s.connect_ex((host, port))
        print(f"Host: {host}:{port} -> {'SUCCESS (Open)' if result == 0 else f'FAILED (code {result})'}", flush=True)
        s.close()
