# Video Editor App

A video editor application with transcription and audio waveform visualization.

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

After installing WaveSurfer.js, uncomment the WaveSurfer import and code sections in `src/pages/EditPage.js`.

## Features

- Video uploading and preview
- Mock transcription display
- Audio waveform visualization using WaveSurfer.js
- Basic video playback controls

## Development

Start the development server:

```bash
npm start
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