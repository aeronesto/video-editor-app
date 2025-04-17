# Video Editor App

A video editor application with transcription and audio waveform visualization.

## Features

- Video uploading and preview
- Audio waveform visualization using WaveSurfer.js
- Video playback controls
- Word-level transcription using WhisperX
- Ability to seek to specific points in the video via waveform

## Project Structure

This project consists of two main components:

1. **Frontend**: React application for video editing and transcription display
2. **Backend**: WhisperX transcription server for generating word-level timestamps

## Installation and Setup

### Prerequisites

- Node.js for the frontend
- Python 3.10 specifically for the backend (WhisperX requires Python 3.9-3.12)
- FFmpeg installed on your system

### Frontend Setup

1. Clone the repository:
```bash
git clone https://github.com/aeronesto/video-editor-app.git
cd video-editor-app
```

2. Install frontend dependencies:
```bash
npm install
```

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Create a Python 3.10 virtual environment:
```bash
# For macOS/Linux
python3.10 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
venv\Scripts\activate
```

3. Install backend dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

### Start the Backend Server

1. From the server directory with the virtual environment activated:
```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

The backend server will start on http://localhost:8000

### Start the Frontend

1. In a separate terminal, from the project root:
```bash
npm start
```

The frontend will start on http://localhost:3000

## Testing the WhisperX Integration

To verify WhisperX is working correctly with your system:

```bash
cd server
python test_whisperx.py
```

## Following Along with Tutorial Videos

### 0. Clone the Repository

If you're just joining us in this project for the first time and you need to clone the repo, start here.

Run this command to download the repository to your local machine (beyond shallow clone):

```bash
git clone --depth=1000 https://github.com/aeronesto/video-editor-app.git
cd video-editor-app
```

(The `--depth` flag ensures that git doesn't do a shallow clone of the repo.)

### 1. Fetch the Latest Changes from the Original Repository

If you've been following along from previous videos and you've already cloned the repo, please continue on from here.

If you haven't already, ensure your local repository has the latest commits from the original (upstream) repository:

```bash
git fetch upstream  # assuming "upstream" is the original repo
```

*(If you haven't set up the original repository as a remote, do so first: `git remote add upstream <original-repo-url>`)*

### 2. Check Out the Desired Commit

Use `git checkout` to move to the exact commit referenced in the tutorial:

```bash
git checkout <starting-commit-id>
```

This puts you in a "detached HEAD" state, meaning you're not on a branch but directly at that commit.

### 3a. Follow along: check out the starting commit

(Use the start commit ID to code along from the start)

Save this state in a new branch:

```bash
git checkout -b <episode-#>
```

- Now you're on a new branch that points to the tutorial's starting commit.
- If you encounter errors about the commit ID not existing, ensure you've fetched all history (`git fetch --all`).

### 3b. View complete episode code: check out the ending commit

(Use the end commit ID to view the code as it is after completing this video)

Save this state in a new branch:

```bash
git checkout -b <episode-#>
```

- Now you're on a new branch that points to the tutorial's ending commit.
- If you encounter errors about the commit ID not existing, ensure you've fetched all history (`git fetch --all`).

### 4. Verify the Commit

Confirm you're at the right place:

```bash
git log --oneline -n 1
```

The output should show the tutorial's starting/ending commit ID and message, depending on if you chose step 3a or 3b.

### Example

For episode #3, if you want to start coding along from the beginning of the episode:

```bash
git fetch upstream  # assuming "upstream" is the original repo
git checkout 4a2727d
git checkout -b episode-3
git log --oneline -n 1  # Should show 4a2727d
```

This will place you at the exact commit that was used at the start of episode #3.