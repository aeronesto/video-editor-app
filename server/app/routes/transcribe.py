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

def get_align_model(language_code: str, align_model: Optional[str] = None):
    global align_models
    model_key = f"{language_code}_{align_model if align_model else 'default'}"
    if model_key in align_models:
        return align_models[model_key]
    try:
        logger.info(f"Loading alignment model for language: {language_code}" + 
                  (f" using model: {align_model}" if align_model else ""))
        model_a, metadata = whisperx.load_align_model(
            language_code=language_code,
            device=config.DEVICE,
            model_name=align_model
        )
        align_models[model_key] = (model_a, metadata)
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
    align_model: Optional[str] = None
    highlight_words: bool = False
    vad_onset: Optional[float] = None

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
    align_model: Optional[str] = None,
    highlight_words: bool = False,
    vad_onset: Optional[float] = None,
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
        
        # Apply VAD parameters if provided
        vad_parameters = {}
        if vad_onset is not None:
            vad_parameters["vad_onset"] = vad_onset
            logger.info(f"Using custom VAD onset: {vad_onset}")
        
        result = asr.transcribe(audio, batch_size=batch_size, language=language, **vad_parameters)
        language_code = result.get("language")
        
        # Align for word-level timestamps
        model_a, metadata = get_align_model(language_code, align_model)
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
        
        response_data = {"text": text, "segments": segments, "language": language_code}
        if highlight_words:
            response_data["highlight_words"] = True
            
        return JSONResponse(content=response_data)
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
        asr = load_asr_model(request.model_name, config.DEVICE, request.compute_type)
        audio = whisperx.load_audio(request.file_path)
        
        # Apply VAD parameters if provided
        vad_parameters = {}
        if request.vad_onset is not None:
            vad_parameters["vad_onset"] = request.vad_onset
            logger.info(f"Using custom VAD onset: {request.vad_onset}")
            
        result = asr.transcribe(
            audio, batch_size=request.batch_size, language=request.language, **vad_parameters
        )
        language_code = result.get("language")
        
        model_a, metadata = get_align_model(language_code, request.align_model)
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
            
        response_data = {"text": text, "segments": segments, "language": language_code}
        if request.highlight_words:
            response_data["highlight_words"] = True
            
        return JSONResponse(content=response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during transcription-file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Transcription failed")