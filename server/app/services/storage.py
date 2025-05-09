"""
Storage service for handling video file uploads.
Supports local and cloud storage (Google Cloud Storage).
"""
from abc import ABC, abstractmethod
import os
import logging
import shutil
from fastapi import UploadFile

# Initialize logger
logger = logging.getLogger(__name__)

class StorageService(ABC):
    """Abstract base class for storage services."""
    
    @abstractmethod
    async def save_video(self, file: UploadFile, video_id: str, original_filename: str) -> str:
        """
        Save a video file to storage.
        
        Args:
            file: The uploaded file
            video_id: A unique identifier for the video
            original_filename: Original filename from the user
            
        Returns:
            The path where the file was saved
        """
        pass

class LocalStorageService(StorageService):
    """Service for storing files on the local filesystem."""
    
    def __init__(self, storage_path: str):
        """
        Initialize local storage service.
        
        Args:
            storage_path: Directory path where files will be stored
        """
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
        logger.info(f"LocalStorageService initialized with path: {storage_path}")

    async def save_video(self, file: UploadFile, video_id: str, original_filename: str) -> str:
        """Save video to local filesystem."""
        try:
            # Get file extension
            file_extension = os.path.splitext(original_filename)[1]
            # Sanitize the original filename part
            sanitized_original_filename = os.path.splitext(os.path.basename(original_filename))[0]
            sanitized_original_filename = "".join(c if c.isalnum() or c in ('.', '-', '_') else '_' for c in sanitized_original_filename)
            sanitized_original_filename = sanitized_original_filename[:50]  # Keep it reasonably short
            
            # Create filename with video_id and sanitized original filename
            video_filename = f"video_{video_id}_{sanitized_original_filename}{file_extension}"
            file_path = os.path.join(self.storage_path, video_filename)
            
            # Save the file
            with open(file_path, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
            
            logger.info(f"File '{original_filename}' saved locally as '{video_filename}'")
            return file_path
        except Exception as e:
            logger.error(f"Error saving file locally: {e}", exc_info=True)
            raise

class GCSStorageService(StorageService):
    """Service for storing files on Google Cloud Storage."""
    
    def __init__(self, bucket_name: str):
        """
        Initialize GCS storage service.
        
        Args:
            bucket_name: Name of the GCS bucket
        """
        try:
            # Import here to avoid dependency issues when not using GCS
            from google.cloud import storage
            
            self.client = storage.Client()
            self.bucket = self.client.bucket(bucket_name)
            logger.info(f"GCSStorageService initialized with bucket: {bucket_name}")
        except ImportError:
            logger.error("google-cloud-storage package is required for GCS storage")
            raise

    async def save_video(self, file: UploadFile, video_id: str, original_filename: str) -> str:
        """Save video to Google Cloud Storage."""
        try:
            # Get file extension
            file_extension = os.path.splitext(original_filename)[1]
            # Sanitize the original filename part
            sanitized_original_filename = os.path.splitext(os.path.basename(original_filename))[0]
            sanitized_original_filename = "".join(c if c.isalnum() or c in ('.', '-', '_') else '_' for c in sanitized_original_filename)
            sanitized_original_filename = sanitized_original_filename[:50]  # Keep it reasonably short
            
            # Create filename with video_id and sanitized original filename
            video_filename = f"video_{video_id}_{sanitized_original_filename}{file_extension}"
            
            # Upload to GCS
            blob = self.bucket.blob(f"videos/{video_filename}")
            file_content = await file.read()
            blob.upload_from_string(file_content, content_type=file.content_type)
            
            gcs_path = f"gs://{self.bucket.name}/videos/{video_filename}"
            logger.info(f"File '{original_filename}' saved to GCS as '{gcs_path}'")
            return gcs_path
        except Exception as e:
            logger.error(f"Error saving file to GCS: {e}", exc_info=True)
            raise

def get_storage_service() -> StorageService:
    """
    Factory function to get the appropriate storage service based on configuration.
    
    Returns:
        An instance of a StorageService implementation
    """
    storage_type = os.getenv("STORAGE_TYPE", "local").lower()
    
    if storage_type == "gcs":
        bucket_name = os.getenv("GCS_BUCKET_NAME")
        if not bucket_name:
            logger.error("GCS_BUCKET_NAME environment variable is required for GCS storage")
            raise ValueError("GCS_BUCKET_NAME environment variable is required")
        return GCSStorageService(bucket_name)
    else:
        # Default to local storage
        from config import UPLOAD_DIR
        return LocalStorageService(UPLOAD_DIR) 