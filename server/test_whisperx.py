#!/usr/bin/env python3
"""
Test script for WhisperX integration
This will help verify WhisperX is working correctly with the current installation
"""

import os
import whisperx
import logging
import time
import torch

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TEST_FILE = "../public/2x.mp4"

def test_whisperx():
    """Test WhisperX functionality with a sample audio file"""
    start_time = time.time()
    
    # Check if test file exists
    if not os.path.exists(TEST_FILE):
        logger.error(f"Test file not found: {TEST_FILE}")
        return False
    
    logger.info(f"Testing WhisperX with file: {TEST_FILE}")
    
    try:
        # Load device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        # Set appropriate compute type
        compute_type = "float32"  # Use float32 for CPU compatibility
        logger.info(f"Using compute type: {compute_type}")
        
        # Load model
        logger.info("Loading model...")
        model = whisperx.load_model("medium", device, compute_type=compute_type)
        
        # Load audio
        logger.info("Loading audio...")
        audio = whisperx.load_audio(TEST_FILE)
        
        # Transcribe
        logger.info("Transcribing audio...")
        try:
            result = model.transcribe(audio, batch_size=8)
        except TypeError as e:
            logger.warning(f"Error with basic transcribe: {e}")
            logger.info("Trying with additional parameters...")
            result = model.transcribe(
                audio, 
                batch_size=8, 
                vad=True,
                task="transcribe"
            )
        
        language = result["language"]
        logger.info(f"Detected language: {language}")
        
        # Load alignment model
        logger.info("Loading alignment model...")
        model_a, metadata = whisperx.load_align_model(language_code=language, device=device)
        
        # Align
        logger.info("Aligning transcription...")
        result = whisperx.align(result["segments"], model_a, metadata, audio, device)
        
        # Show some results
        logger.info("Transcription successful!")
        logger.info(f"Transcribed text (first 100 chars): {result['segments'][0]['text'][:100] if result['segments'] else 'No text'}")
        logger.info(f"Number of segments: {len(result['segments'])}")
        logger.info(f"Time taken: {time.time() - start_time:.2f} seconds")
        
        return True
    except Exception as e:
        logger.error(f"Error testing WhisperX: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    logger.info("Starting WhisperX test...")
    success = test_whisperx()
    logger.info(f"WhisperX test {'successful' if success else 'failed'}") 