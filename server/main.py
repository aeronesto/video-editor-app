import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from app.routes import transcribe_router, upload_router, video_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="WhisperX Transcription API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(config.UPLOAD_DIR, exist_ok=True)
logger.info(f"Upload directory: {config.UPLOAD_DIR}")

# Include transcription routes
app.include_router(transcribe_router)
# Include upload routes
app.include_router(upload_router)
# Include video routes
app.include_router(video_router)