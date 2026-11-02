import os
import uuid
from typing import Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = os.getenv("SUPABASE_STORAGE_BUCKET", "tutornow-uploads")

# Use service role key if available for administrative permissions, otherwise standard key
client_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY

supabase_client: Optional[Client] = None
if SUPABASE_URL and client_key:
    try:
        supabase_client = create_client(SUPABASE_URL, client_key)
    except Exception as e:
        print(f"[STORAGE WARN] Could not initialize Supabase client: {e}")

def upload_file_to_supabase(
    file_bytes: bytes,
    file_name: str,
    content_type: str,
    folder: str = "uploads"
) -> Tuple[Optional[str], Optional[str]]:
    """
    Uploads a file to Supabase Storage and returns (public_url, unique_file_path).
    Returns (None, None) if Supabase storage upload fails.
    """
    if not supabase_client or not SUPABASE_URL:
        return None, None

    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"
    unique_key = f"{folder}/{uuid.uuid4().hex[:12]}.{extension}"

    try:
        res = supabase_client.storage.from_(BUCKET_NAME).upload(
            path=unique_key,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{BUCKET_NAME}/{unique_key}"
        print(f"[SUPABASE STORAGE] Successfully uploaded {unique_key} to bucket '{BUCKET_NAME}'")
        return public_url, unique_key
    except Exception as err:
        print(f"[SUPABASE STORAGE ERROR] Failed to upload to bucket '{BUCKET_NAME}': {err}")
        return None, None

def delete_file_from_supabase(file_path: str) -> bool:
    """Deletes a file from Supabase Storage."""
    if not supabase_client:
        return False
    try:
        supabase_client.storage.from_(BUCKET_NAME).remove([file_path])
        return True
    except Exception as err:
        print(f"[SUPABASE STORAGE ERROR] Failed to delete file {file_path}: {err}")
        return False
