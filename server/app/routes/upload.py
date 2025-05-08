import os
import shutil
import uuid
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException

import config # Assuming config.py is accessible from this path

# Initialize logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload")
async def create_upload_file(file: UploadFile = File(...)):
    """
    Receives a video file, saves it to the upload directory,
    and returns a unique video ID.
    """
    try:
        # Get file extension
        file_extension = os.path.splitext(file.filename)[1]
        # Sanitize the original filename part to be included
        original_filename_part =  os.path.splitext(os.path.basename(file.filename))[0]
        sanitized_original_filename = "".join(c if c.isalnum() or c in ('.', '-', '_') else '_' for c in original_filename_part)
        # Limit the length of the sanitized original filename part
        sanitized_original_filename = sanitized_original_filename[:50] # Keep it reasonably short

        # Generate a unique video ID including the sanitized original filename for readability
        video_id = uuid.uuid4()
        video_filname = f"video_{video_id}_{sanitized_original_filename}{file_extension}"
        file_location = os.path.join(config.UPLOAD_DIR, video_filname)
        
        # Save the file
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        
        logger.info(f"File '{file.filename}' uploaded and saved as video_id='{video_id}' at '{file_location}'")
        return {"videoId": video_id}
    except Exception as e:
        logger.error(f"Could not upload file: {e}", exc_info=True)
        # It's good practice to not expose internal error details to the client directly in production
        raise HTTPException(status_code=500, detail="Could not process uploaded file.") 