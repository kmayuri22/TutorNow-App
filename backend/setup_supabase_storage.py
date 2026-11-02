import os
import requests
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

print(f"Target Supabase Project: {url}")

# 1. Create or get bucket 'tutornow-uploads'
bucket_name = "tutornow-uploads"
res = requests.post(
    f"{url}/storage/v1/bucket",
    headers=headers,
    json={"id": bucket_name, "name": bucket_name, "public": True, "file_size_limit": 10485760}
)
print("Create bucket status:", res.status_code, res.text)

# 2. List buckets
res_list = requests.get(f"{url}/storage/v1/bucket", headers=headers)
print("Buckets list:", res_list.status_code, res_list.text)

# 3. Test uploading a small sample file to Supabase storage
upload_headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "text/plain"
}
upload_res = requests.post(
    f"{url}/storage/v1/object/{bucket_name}/test_hello.txt",
    headers=upload_headers,
    data=b"Hello Supabase Storage from TutorNow!"
)
print("Upload test status:", upload_res.status_code, upload_res.text)

# 4. Public URL check
public_url = f"{url}/storage/v1/object/public/{bucket_name}/test_hello.txt"
print("Public URL:", public_url)
r_pub = requests.get(public_url)
print("Public fetch status:", r_pub.status_code, r_pub.text)
