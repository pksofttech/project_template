import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.stdio import print_error, print_success, time_now

router = APIRouter(
    prefix="/api/upload",
    tags=["Upload & Storage"],
)

UPLOAD_DIR = Path("./static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/image", summary="Upload image file (avatar, logos, attachments)")
async def upload_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed extensions: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit (10MB)",
        )

    unique_id = uuid.uuid4().hex[:12]
    timestamp = time_now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{unique_id}{ext}"
    destination_path = UPLOAD_DIR / safe_filename

    try:
        with open(destination_path, "wb") as f:
            f.write(content)
        print_success(f"Uploaded file saved: {destination_path} ({len(content)} bytes)")
    except Exception as err:
        print_error(f"Failed to write uploaded file: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file",
        ) from err

    web_url = f"/static/uploads/{safe_filename}"
    return {
        "success": True,
        "filename": safe_filename,
        "original_name": file.filename,
        "url": web_url,
        "size_bytes": len(content),
    }
