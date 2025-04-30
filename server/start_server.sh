#!/bin/bash
# Ensure script runs in its own directory
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "Activated virtual environment"
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "Virtual environment created and packages installed"
fi

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "WARNING: ffmpeg not found, which is required for WhisperX to work"
    echo "Please install ffmpeg:"
    echo "  - On macOS: brew install ffmpeg"
    echo "  - On Ubuntu: sudo apt-get install ffmpeg"
fi

# Set environment variables for better performance
export OMP_NUM_THREADS=1  # Prevents issues with parallel processing
export MKL_NUM_THREADS=1  # For Intel MKL

echo "Starting FastAPI server..."
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level info