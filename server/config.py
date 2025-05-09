"""
Configuration for WhisperX Transcription API.
"""
import os
import torch

# Base directory for server
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Directory to save uploaded files
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# Storage configuration
# Values: "local" or "gcs" (Google Cloud Storage)
STORAGE_TYPE = os.getenv("STORAGE_TYPE", "local").lower()
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")

# Determine default compute device and type
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float32"

# Default ASR model name
ASR_MODEL_NAME = "medium"

# CORS origins allowed
ALLOWED_ORIGINS = ["http://localhost:3000"]