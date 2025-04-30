"""
Transcription endpoints for WhisperX API.
"""
import os
import shutil
import json
import logging

from fastapi import APIRouter, BackgroundTasks, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

import whisperx
import torch

import config

# Initialize logger
logger = logging.getLogger(__name__)

# Caches for models
asr_model = None
align_models = {}

def load_asr_model(model_name: str, device: str, compute_type: str):
    global asr_model
    if asr_model is not None:
        return asr_model
    try:
        logger.info(f"Loading ASR model: {model_name} ({compute_type}) on {device}")
        asr_model = whisperx.load_model(
            model_name,
            device,
            compute_type=compute_type,
            multilingual=None,
            max_new_tokens=None,
            clip_timestamps="0",
            hallucination_silence_threshold=None,
            hotwords=None
        )
        return asr_model
    except Exception as e:
        logger.error(f"Failed to load ASR model: {e}")
        raise HTTPException(status_code=500, detail="Could not load ASR model")

def get_align_model(language_code: str):
    global align_models
    if language_code in align_models:
        return align_models[language_code]
    try:
        logger.info(f"Loading alignment model for language: {language_code}")
        model_a, metadata = whisperx.load_align_model(
            language_code=language_code,
            device=config.DEVICE
        )
        align_models[language_code] = (model_a, metadata)
        return model_a, metadata
    except Exception as e:
        logger.error(f"Failed to load alignment model: {e}")
        raise HTTPException(status_code=500, detail="Could not load alignment model")

def save_upload_file(upload_file: UploadFile) -> str:
    file_name = upload_file.filename.replace(' ', '_')
    file_path = os.path.join(config.UPLOAD_DIR, f"{file_name}.mp4")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return file_path

def cleanup_temp_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
            logger.info(f"Removed file: {path}")
    except Exception as e:
        logger.error(f"Error removing file {path}: {e}")

router = APIRouter()

class TranscriptionRequest(BaseModel):
    file_path: str
    model_name: str = config.ASR_MODEL_NAME
    language: Optional[str] = None
    compute_type: str = config.COMPUTE_TYPE
    batch_size: int = 8

class WordLevel(BaseModel):
    word: str
    start: float
    end: float
    score: Optional[float] = 0.0

class Segment(BaseModel):
    id: int
    text: str
    start: float
    end: float
    words: Optional[List[WordLevel]] = None

class TranscriptionResponse(BaseModel):
    text: str
    segments: List[Segment]
    language: str

@router.post("/transcribe/", response_model=TranscriptionResponse)
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model_name: str = config.ASR_MODEL_NAME,
    language: Optional[str] = None,
    batch_size: int = 8,
):
    """
    Upload and transcribe a video/audio file.
    """
    file_path = None
    try:
        asr = load_asr_model(model_name, config.DEVICE, config.COMPUTE_TYPE)
        file_path = save_upload_file(file)
        logger.info(f"Saved uploaded file to {file_path}")
        # Load and transcribe
        audio = whisperx.load_audio(file_path)
        result = asr.transcribe(audio, batch_size=batch_size, language=language)
        language_code = result.get("language")
        # Align for word-level timestamps
        model_a, metadata = get_align_model(language_code)
        result = whisperx.align(
            result.get("segments", []),
            model_a,
            metadata,
            audio,
            config.DEVICE,
            return_char_alignments=False,
        )
        # Format output
        text = " ".join([seg.get("text", "") for seg in result.get("segments", [])])
        segments = []
        for seg in result.get("segments", []):
            words = [WordLevel(**w) for w in seg.get("words", [])]
            segments.append(Segment(
                id=seg.get("id"), text=seg.get("text"),
                start=seg.get("start"), end=seg.get("end"), words=words
            ))
        # Schedule cleanup
        background_tasks.add_task(cleanup_temp_file, file_path)
        return JSONResponse(content={"text": text, "segments": segments, "language": language_code})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during transcription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Transcription failed")

@router.post("/transcribe-file/", response_model=TranscriptionResponse)
async def transcribe_file_endpoint(request: TranscriptionRequest):
    """
    Transcribe a file already on the server.
    """
    try:
        asr = load_asr_model(request.model_name, config.DEVICE, config.COMPUTE_TYPE)
        audio = whisperx.load_audio(request.file_path)
        result = asr.transcribe(
            audio, batch_size=request.batch_size, language=request.language
        )
        language_code = result.get("language")
        model_a, metadata = get_align_model(language_code)
        result = whisperx.align(
            result.get("segments", []), model_a, metadata,
            audio, config.DEVICE, return_char_alignments=False
        )
        text = " ".join([seg.get("text", "") for seg in result.get("segments", [])])
        segments = []
        for seg in result.get("segments", []):
            words = [WordLevel(**w) for w in seg.get("words", [])]
            segments.append(Segment(
                id=seg.get("id"), text=seg.get("text"),
                start=seg.get("start"), end=seg.get("end"), words=words
            ))
        return JSONResponse(content={"text": text, "segments": segments, "language": language_code})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during transcription-file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Transcription failed")