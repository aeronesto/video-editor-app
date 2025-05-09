import os
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import config

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/video/{video_id}")
async def get_video(video_id: str):
    """
    Serves a video file based on its video_id.
    The video_id is expected to be part of the filename in the UPLOAD_DIR.
    Example filename: video_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx_originalfilename.mp4
    """
    try:
        logger.info(f"Attempting to find video with ID: {video_id}")
        # Construct the expected prefix for the video file
        file_prefix_to_find = f"video_{video_id}_"
        
        found_file_path = None
        
        # Scan the upload directory for the file
        for filename in os.listdir(config.UPLOAD_DIR):
            if filename.startswith(file_prefix_to_find):
                found_file_path = os.path.join(config.UPLOAD_DIR, filename)
                logger.info(f"Found video file: {found_file_path}")
                break
        
        if found_file_path and os.path.exists(found_file_path):
            # Return the file as a response
            # The media_type can be dynamically determined if needed, 
            # or assumed based on common video types.
            # For simplicity, we'll let FileResponse try to infer it or use a default.
            return FileResponse(path=found_file_path, media_type='video/mp4', filename=os.path.basename(found_file_path))
        else:
            logger.warning(f"Video file with ID '{video_id}' not found in {config.UPLOAD_DIR}.")
            raise HTTPException(status_code=404, detail="Video not found")
            
    except Exception as e:
        logger.error(f"Error serving video {video_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while retrieving video.") 