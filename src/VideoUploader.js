import React, { useState, useRef } from 'react';
import './VideoUploader.css';

function VideoUploader() {
  const [videoFile, setVideoFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const videoRef = useRef(null);
  
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
    setEditing(true);
  };
  
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
  
  if (!editing) {
    return (
      <div className="upload-container">
        <h2>Upload Video</h2>
        <div 
          className={`upload-area ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <p>Drag and drop your video here</p>
          <label className="upload-button">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleChange} 
              hidden 
            />
            <span>Browse Files</span>
          </label>
        </div>
      </div>
    );
  }
  
  return (
    <div className="edit-container">
      <h2>Edit Video: {videoFile.name}</h2>
      <button 
        className="back-button" 
        onClick={() => {
          setVideoFile(null);
          setEditing(false);
        }}
      >
        Back to Upload
      </button>
      
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
          <h3>Video Preview</h3>
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

export default VideoUploader; 