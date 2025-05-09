import os
import uuid
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException

import config
from app.services.storage import get_storage_service

# Initialize logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload")
async def create_upload_file(file: UploadFile = File(...)):
    """
    Receives a video file, saves it to the configured storage system,
    and returns a unique video ID.
    """
    try:
        # Generate a unique video ID
        video_id = uuid.uuid4()
        
        # Get the appropriate storage service based on environment configuration
        storage_service = get_storage_service()
        
        # Save the file using the storage service
        file_path = await storage_service.save_video(file, str(video_id), file.filename)
        
        logger.info(f"File '{file.filename}' uploaded and saved as video_id='{video_id}' at '{file_path}'")
        return {"video_id": video_id}
    except Exception as e:
        logger.error(f"Could not upload file: {e}", exc_info=True)
        # It's good practice to not expose internal error details to the client directly in production
        raise HTTPException(status_code=500, detail="Could not process uploaded file.") 