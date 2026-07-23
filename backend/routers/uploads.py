import os
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import auth

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

# Directory where uploaded files will be stored
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/jpg": "image",
    "image/webp": "image",
}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    doc_label: str = Form(default="Qualification Certificate"),
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db),
):
    """
    Upload a tutor qualification certificate (PDF or image).
    Only accessible by authenticated tutors.
    """
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Validate content type
    content_type = file.content_type
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' is not allowed. Upload PDF or image (JPEG, PNG, WebP)."
        )

    file_type = ALLOWED_TYPES[content_type]

    # Read file and check size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the maximum allowed size of {MAX_FILE_SIZE_MB}MB."
        )

    # Generate a unique filename to avoid collisions
    extension = "pdf" if file_type == "pdf" else file.filename.rsplit(".", 1)[-1].lower()
    unique_name = f"tutor_{tutor.id}_{uuid.uuid4().hex[:8]}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Write file to disk
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Store document record in DB
    doc = models.TutorDocument(
        tutor_id=tutor.id,
        file_name=file.filename or unique_name,
        file_path=unique_name,   # Store only the relative filename
        file_type=file_type,
        doc_label=doc_label,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "file_path": doc.file_path,
        "file_type": doc.file_type,
        "doc_label": doc.doc_label,
        "url": f"/api/uploads/{unique_name}",
        "uploaded_at": doc.uploaded_at,
    }


@router.post("/profile-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db),
):
    """Upload tutor profile photo (image only)."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    content_type = file.content_type
    if content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only image files are allowed for profile photos.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File exceeds the {MAX_FILE_SIZE_MB}MB limit.")

    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    unique_name = f"photo_{tutor.id}_{uuid.uuid4().hex[:8]}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    tutor.profile_image = f"/api/uploads/{unique_name}"
    db.commit()

    return {"profile_image": tutor.profile_image, "filename": unique_name}


@router.get("/{filename}")
def serve_file(filename: str):
    """Serve an uploaded file by filename."""
    # Sanitize path to prevent directory traversal
    safe_name = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.delete("/certificate/{doc_id}")
def delete_certificate(
    doc_id: int,
    current_user: models.User = Depends(auth.RoleChecker(["Tutor"])),
    db: Session = Depends(get_db),
):
    """Delete a tutor's uploaded document."""
    tutor = db.query(models.Tutor).filter(models.Tutor.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    doc = db.query(models.TutorDocument).filter(
        models.TutorDocument.id == doc_id,
        models.TutorDocument.tutor_id == tutor.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from disk
    file_path = os.path.join(UPLOAD_DIR, doc.file_path)
    if os.path.isfile(file_path):
        os.remove(file_path)

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
