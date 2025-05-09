import os
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import config
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/video/{video_id}")
async def get_video(video_id: str):
    """
    Serves a video file based on its video_id.
    The video is retrieved using the configured storage service.
    """
    try:
        logger.info(f"Retrieving video with ID: {video_id}")
        
        # Get the appropriate storage service based on environment configuration
        storage_service = get_storage_service()
        
        # Try to get the video from the storage service
        result = await storage_service.get_video(video_id)
        
        if result:
            file_path, content_type = result
            logger.info(f"Serving video file: {file_path}")
            return FileResponse(
                path=file_path, 
                media_type=content_type, 
                filename=os.path.basename(file_path)
            )
        else:
            logger.warning(f"Video file with ID '{video_id}' not found.")
            raise HTTPException(status_code=404, detail="Video not found")
            
    except Exception as e:
        logger.error(f"Error serving video {video_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while retrieving video.") 