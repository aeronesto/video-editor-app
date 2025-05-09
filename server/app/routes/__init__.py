"""
Routes package initializer.
"""
# Import routers here to register endpoints
from .transcribe import router as transcribe_router
from .upload import router as upload_router
from .video import router as video_router

__all__ = ['transcribe_router', 'upload_router', 'video_router']