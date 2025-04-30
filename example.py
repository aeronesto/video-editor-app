#!/usr/bin/env python3
"""
Example script for using WhisperX for transcription with word-level timestamps
"""

import sys
import whisperx
import gc
import torch

def transcribe_audio(audio_path, model_name="medium", language=None):
    """
    Transcribe audio file using WhisperX
    
    Args:
        audio_path: Path to audio file
        model_name: Whisper model size ('tiny', 'base', 'small', 'medium', 'large-v2')
        language: Language code (e.g., 'en', 'fr', 'de') or None for auto-detection
    
    Returns:
        Transcription result with aligned word-level timestamps
    """
    # Check if CUDA is available, otherwise use CPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if torch.cuda.is_available() else "int8"
    
    print(f"Using device: {device}")
    print(f"Loading model: {model_name}")
    
    # 1. Load model and transcribe
    model = whisperx.load_model(model_name, device, compute_type=compute_type)
    
    # Load audio
    audio = whisperx.load_audio(audio_path)
    
    # Transcribe audio
    result = model.transcribe(audio, language=language)
    
    detected_language = result["language"]
    print(f"Detected language: {detected_language}")
    
    # Clean up memory
    del model
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # 2. Align whisper output
    print("Aligning timestamps...")
    model_a, metadata = whisperx.load_align_model(language_code=detected_language, device=device)
    result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)
    
    # Clean up memory again
    del model_a
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    return result

def display_results(result):
    """Display nicely formatted transcription results"""
    print("\n=== Transcription Results ===\n")
    
    for i, segment in enumerate(result["segments"]):
        start = segment["start"]
        end = segment["end"]
        text = segment["text"]
        
        # Format timestamp as [MM:SS.ms]
        start_fmt = f"{int(start//60):02d}:{start%60:06.3f}"
        end_fmt = f"{int(end//60):02d}:{end%60:06.3f}"
        
        print(f"[{start_fmt} --> {end_fmt}] {text}")
        
        # Show word-level timestamps if available
        if "words" in segment:
            print("  Word timestamps:")
            for word in segment["words"]:
                word_start = word["start"]
                word_end = word["end"]
                word_text = word["word"]
                
                # Format timestamp as [MM:SS.ms]
                word_start_fmt = f"{int(word_start//60):02d}:{word_start%60:06.3f}"
                word_end_fmt = f"{int(word_end//60):02d}:{word_end%60:06.3f}"
                
                print(f"    [{word_start_fmt} --> {word_end_fmt}] {word_text}")
            
        print()

def main():
    # Check if an audio file was provided
    if len(sys.argv) < 2:
        print("Usage: python example.py <audio_file> [model_name] [language_code]")
        print("  model_name: tiny, base, small, medium, large-v2 (default: medium)")
        print("  language_code: en, fr, de, etc. (default: auto-detect)")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    # Optional model name
    model_name = "medium"
    if len(sys.argv) >= 3:
        model_name = sys.argv[2]
    
    # Optional language code
    language = None
    if len(sys.argv) >= 4:
        language = sys.argv[3]
    
    # Run transcription
    result = transcribe_audio(audio_path, model_name, language)
    
    # Display results
    display_results(result)

if __name__ == "__main__":
    main() 