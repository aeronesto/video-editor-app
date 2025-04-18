import os
import shutil
import tempfile
from typing import Dict, List, Optional
import json

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import whisperx
import gc
import torch
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="WhisperX Transcription API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory for uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Determine default compute type based on device
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float32"  # Use float32 for CPU compatibility
logger.info(f"Using device: {device}, compute type: {compute_type}")

# Global models cache
asr_model = None
align_models = {}

# Preload the ASR model at startup
def load_asr_model():
    global asr_model
    try:
        logger.info(f"Preloading WhisperX model: medium with compute_type: {compute_type}")
        # Define options required by newer whisperx versions
        asr_options = {
            "multilingual": None, 
            "max_new_tokens": None, 
            "clip_timestamps": "0", 
            "hallucination_silence_threshold": None,
            "hotwords": None
        }
        # Pass asr_options dict to load_model
        asr_model = whisperx.load_model(
            "medium", 
            device, 
            compute_type=compute_type,
            asr_options=asr_options
        )
        logger.info("WhisperX model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading WhisperX model: {str(e)}")
        return False

# Load alignment model for a specific language
def get_align_model(language_code):
    global align_models
    
    if language_code in align_models:
        return align_models[language_code]
    
    try:
        logger.info(f"Loading alignment model for language: {language_code}")
        model_a, metadata = whisperx.load_align_model(language_code=language_code, device=device)
        align_models[language_code] = (model_a, metadata)
        return model_a, metadata
    except Exception as e:
        logger.error(f"Error loading alignment model for {language_code}: {str(e)}")
        raise

class TranscriptionRequest(BaseModel):
    file_path: str
    model_name: str = "medium"
    language: Optional[str] = None
    compute_type: str = compute_type
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

def cleanup_temp_file(file_path):
    """Remove a temporary file if it exists"""
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info(f"Removed temporary file: {file_path}")
        except Exception as e:
            logger.error(f"Error removing file {file_path}: {str(e)}")

def save_upload_file(upload_file: UploadFile) -> str:
    """Save an upload file to disk and return the file path"""
    file_path = os.path.join(UPLOAD_DIR, f"{upload_file.filename.replace(' ', '_')}.mp4")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    return file_path

@app.post("/transcribe/", response_model=TranscriptionResponse)
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model_name: str = "medium",
    language: Optional[str] = None,
    batch_size: int = 8
):
    """
    Process an audio file and return the transcription with word-level timestamps.
    """
    file_path = None
    try:
        # Check if model is loaded
        global asr_model
        if asr_model is None:
            if not load_asr_model():
                raise HTTPException(status_code=500, detail="Failed to load ASR model")
        
        # Save uploaded file
        file_path = save_upload_file(file)
        logger.info(f"Saved uploaded file to {file_path}")
        
        # 1. Load audio
        logger.info("Loading audio file...")
        audio = whisperx.load_audio(file_path)
        
        # 2. Transcribe with WhisperX
        logger.info("Transcribing audio...")
        
        # Remove extra args from transcribe call, use simple version
        result = asr_model.transcribe(
            audio, 
            batch_size=batch_size, 
            language=language,
        )
        
        language_code = result["language"]
        logger.info(f"Detected language: {language_code}")
        
        # 3. Align the transcription using the appropriate model
        logger.info("Aligning transcription...")
        model_a, metadata = get_align_model(language_code)
        
        # Align with word-level timestamps
        result = whisperx.align(
            result["segments"], 
            model_a, 
            metadata, 
            audio, 
            device, 
            return_char_alignments=False
        )
        
        # 4. Format response
        text = " ".join([segment["text"] for segment in result["segments"]])
        formatted_segments = []
        
        for i, segment in enumerate(result["segments"]):
            words = []
            if "words" in segment:
                # Debug: Log the structure of the first word in each segment to see format
                if segment["words"]:
                    logger.info(f"Debug - Word structure: {json.dumps(segment['words'][0])}")
                
                try:
                    words = [
                        WordLevel(
                            word=word["word"],
                            start=word["start"] if "start" in word else word.get("timestamp", (0, 0))[0],
                            end=word["end"] if "end" in word else word.get("timestamp", (0, 0))[1],
                            score=word.get("score", 0.0)
                        )
                        for word in segment["words"]
                    ]
                except Exception as e:
                    logger.error(f"Error processing words: {e}, Word data: {json.dumps(segment['words'][0] if segment['words'] else {})}")
                    # Return the segment even if we can't process the words
                    pass
            
            formatted_segments.append(
                Segment(
                    id=i,
                    text=segment["text"],
                    start=segment["start"],
                    end=segment["end"],
                    words=words
                )
            )
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_temp_file, file_path)
        
        return TranscriptionResponse(
            text=text,
            segments=formatted_segments,
            language=language_code
        )
    
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}", exc_info=True)
        if file_path:
            cleanup_temp_file(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe-file/")
async def transcribe_existing_file(
    background_tasks: BackgroundTasks,
    request: TranscriptionRequest
):
    """Transcribe a file that's already on the server"""
    try:
        # Check if the file exists
        if not os.path.exists(request.file_path):
            # Try with public directory prefix
            public_path = request.file_path
            if not os.path.exists(public_path):
                raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
            request.file_path = public_path
            
        logger.info(f"Transcribing existing file: {request.file_path}")
        
        # Check if model is loaded
        global asr_model
        if asr_model is None:
            if not load_asr_model():
                raise HTTPException(status_code=500, detail="Failed to load ASR model")
                
        # 1. Load audio
        logger.info(f"Loading audio file: {request.file_path}")
        audio = whisperx.load_audio(request.file_path)
        
        # 2. Transcribe with WhisperX
        logger.info("Transcribing audio...")
        
        # Remove extra args from transcribe call, use simple version
        result = asr_model.transcribe(
            audio, 
            batch_size=request.batch_size, 
            language=request.language,
        )
        
        language_code = result["language"]
        logger.info(f"Detected language: {language_code}")
        
        # 3. Align the transcription using the appropriate model
        logger.info("Aligning transcription...")
        model_a, metadata = get_align_model(language_code)
        
        # Align with word-level timestamps
        result = whisperx.align(
            result["segments"], 
            model_a, 
            metadata, 
            audio, 
            device, 
            return_char_alignments=False
        )
        
        # 4. Format response
        text = " ".join([segment["text"] for segment in result["segments"]])
        formatted_segments = []
        
        for i, segment in enumerate(result["segments"]):
            words = []
            if "words" in segment:
                # Debug: Log the structure of the first word in each segment to see format
                if segment["words"]:
                    logger.info(f"Debug - Word structure: {json.dumps(segment['words'][0])}")
                
                try:
                    words = [
                        WordLevel(
                            word=word["word"],
                            start=word["start"] if "start" in word else word.get("timestamp", (0, 0))[0],
                            end=word["end"] if "end" in word else word.get("timestamp", (0, 0))[1],
                            score=word.get("score", 0.0)
                        )
                        for word in segment["words"]
                    ]
                except Exception as e:
                    logger.error(f"Error processing words: {e}, Word data: {json.dumps(segment['words'][0] if segment['words'] else {})}")
                    # Return the segment even if we can't process the words
                    pass
            
            formatted_segments.append({
                "id": i,
                "text": segment["text"],
                "start": segment["start"],
                "end": segment["end"],
                "words": words
            })
        
        response = {
            "text": text,
            "segments": formatted_segments,
            "language": language_code
        }
        
        return JSONResponse(content=response)
    
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "WhisperX Transcription API is running"}

@app.on_event("startup")
async def startup_event():
    """Load ASR model on startup"""
    load_asr_model()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 