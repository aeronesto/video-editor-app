"""
Routes package initializer.
"""
# Import routers here to register endpoints
from .transcribe import router as transcribe_router
from .upload import router as upload_router

__all__ = ['transcribe_router', 'upload_router']