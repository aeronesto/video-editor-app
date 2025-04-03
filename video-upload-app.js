// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<UploadPage setVideoFile={setVideoFile} />} />
          <Route path="/edit" element={<EditPage videoFile={videoFile} />} />
        </Routes>
      </div>
    </Router>
  );
}

function UploadPage({ setVideoFile }) {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        handleFile(file);
      } else {
        alert('Please upload a video file.');
      }
    }
  };
  
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        handleFile(file);
      } else {
        alert('Please upload a video file.');
      }
    }
  };
  
  const handleFile = (file) => {
    setVideoFile({
      file: file,
      url: URL.createObjectURL(file),
      name: file.name
    });
    navigate('/edit');
  };
  
  return (
    <div className="upload-container">
      <h1>Upload Page</h1>
      <div 
        className={`upload-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <p>drag to upload video</p>
        <label className="upload-button">
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleChange} 
            hidden 
          />
          <span>upload</span>
        </label>
      </div>
    </div>
  );
}

function EditPage({ videoFile }) {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef(null);
  
  // Mock transcription data
  const mockTranscription = `
    [00:00:01] Hello and welcome to this demonstration.
    [00:00:05] Today we're going to be talking about video editing.
    [00:00:10] As you can see, this interface allows for easy video manipulation.
    [00:00:15] The transcription appears on the left side.
    [00:00:20] And the video preview appears on the right.
    [00:00:25] Below both of these elements are the playback controls.
    [00:00:30] And finally, at the bottom is an audio waveform.
  `;
  
  React.useEffect(() => {
    if (!videoFile) {
      navigate('/');
    }
  }, [videoFile, navigate]);
  
  if (!videoFile) {
    return null;
  }
  
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };
  
  return (
    <div className="edit-container">
      <h1>Edit Page</h1>
      <div className="edit-content">
        <div className="transcription-panel">
          <h3>Transcription</h3>
          <div className="transcription-content">
            {mockTranscription.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
        
        <div className="video-panel">
          <h3>Video</h3>
          <video 
            ref={videoRef}
            src={videoFile.url} 
            className="video-preview"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>
      </div>
      
      <div className="playback-controls">
        <button onClick={togglePlayPause}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input 
          type="range" 
          className="timeline-slider"
          min="0" 
          max="100" 
          defaultValue="0"
          onChange={(e) => {
            if (videoRef.current) {
              const time = (videoRef.current.duration / 100) * e.target.value;
              videoRef.current.currentTime = time;
            }
          }}
        />
      </div>
      
      <div className="audio-waveform">
        <h3>Audio Waveform</h3>
        <div className="mock-waveform">
          {Array(50).fill().map((_, i) => (
            <div 
              key={i} 
              className="waveform-bar" 
              style={{ height: `${Math.random() * 40 + 10}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
