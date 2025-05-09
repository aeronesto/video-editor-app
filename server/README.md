# WhisperX Transcription Server

This server provides word-level timestamp transcription for the Video Editor App using WhisperX.

## Setup Instructions

### Prerequisites

- Python 3.10 (WhisperX requires Python 3.9, 3.10, 3.11, or 3.12)
- FFmpeg installed on your system
- (Optional) CUDA-compatible GPU for faster transcription
- (Optional) Google Cloud Storage account and credentials for cloud storage

### Installation

1. Create a virtual environment with Python 3.10 specifically (required):

```bash
# For macOS/Linux
python3.10 -m venv venv
source venv/bin/activate

# For Windows
# Make sure Python 3.10 is your active Python version or specify the full path
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

This will install:
- WhisperX with all its dependencies
- FastAPI for the API server
- Uvicorn for the ASGI server
- Other required packages

### Starting the Server

You can start the server using the included script:

```bash
# Make sure the script is executable
chmod +x start_server.sh

# Run the script
./start_server.sh
```

Or manually with:

```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --log-level info
```

The server will start on http://localhost:8000

### Testing WhisperX

To verify WhisperX is working correctly with your system:

```bash
python test_whisperx.py
```

This test script will attempt to transcribe a sample file and report if everything is working correctly.

## API Endpoints

### POST /transcribe/

Transcribes a video file and returns word-level timestamps.

**Request:**
- Form data with a 'file' field containing the video file

**Response:**
```json
{
  "text": "Complete transcription text",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.9,
      "text": "Example text of transcription.",
      "words": [
        {
          "word": "Example",
          "start": 0.5,
          "end": 1.1,
          "score": 0.9
        },
        {
          "word": "text",
          "start": 1.2,
          "end": 1.7,
          "score": 0.8
        },
        ...
      ]
    },
    ...
  ],
  "language": "en"
}
```

### POST /transcribe-file/

Transcribes a file that's already on the server.

**Request:**
```json
{
  "file_path": "/path/to/video/file.mp4",
  "model_name": "medium",
  "language": null,
  "compute_type": "float32",
  "batch_size": 8
}
```

**Response:**
Same format as /transcribe/

### GET /

Health check endpoint.

**Response:**
```json
{
  "message": "WhisperX Transcription API is running"
}
```

## Troubleshooting

### GPU Memory Issues
- If you encounter GPU memory issues, try setting `compute_type="int8"` in app.py
- If transcription is slow, consider using a smaller model by changing `"medium"` to `"small"` or `"tiny"` in app.py

### Python Version
- Make sure you're using Python 3.10 specifically with your virtual environment
- If you get dependency errors, verify you're using the correct Python version with `python --version`

### FFmpeg
- WhisperX requires FFmpeg to be installed on your system
- Install FFmpeg:
  - On macOS: `brew install ffmpeg`
  - On Ubuntu: `sudo apt-get install ffmpeg`
  - On Windows: Download from https://ffmpeg.org/download.html or install with Chocolatey: `choco install ffmpeg`

## Storage Configuration

The server supports both local and cloud storage for uploaded video files. Configure the storage type using environment variables:

### Local Storage (Default)

Local storage saves files to the `uploads` directory in the server folder.

```bash
# No configuration needed for local storage (default)
# Or explicitly set:
export STORAGE_TYPE=local
```

### Google Cloud Storage

To use Google Cloud Storage:

1. Install the Google Cloud Storage client:
   ```bash
   pip install google-cloud-storage
   ```

2. Set up authentication:
   - Create a service account with Storage Object Admin permissions
   - Download the JSON key file
   - Set the environment variable to point to your key file:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-project-credentials.json"
     ```

3. Configure the storage settings:
   ```bash
   export STORAGE_TYPE=gcs
   export GCS_BUCKET_NAME=your-bucket-name
   ```