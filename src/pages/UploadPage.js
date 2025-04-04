import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../VideoUploader.css';

function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  
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
    // Create URL and store file info in localStorage for persistence
    const videoData = {
      url: URL.createObjectURL(file),
      name: file.name
    };
    localStorage.setItem('videoData', JSON.stringify(videoData));
    
    // Navigate to the edit page
    navigate('/edit');
  };
  
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

export default UploadPage; 