import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VideoEditorProvider, useVideoEditor } from '../context/VideoEditorContext';
import TranscriptionPanel from '../components/TranscriptionPanel';
import VideoPanel from '../components/VideoPanel';
import PlaybackControls from '../components/PlaybackControls';
import AudioWaveform from '../components/AudioWaveform';

function EditPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    videoFile, 
    setVideoFile 
  } = useVideoEditor();

  // Load video data when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const videoId = params.get('videoId');
    
    if (videoId) {
      const videos = JSON.parse(localStorage.getItem('videos') || '{}');
      const videoData = videos[videoId];
      
      if (videoData) {
        setVideoFile(videoData);
      } else {
        loadDefaultVideo();
      }
    } else {
      loadDefaultVideo();
    }
  }, [location]);

  // Function to load default video
  const loadDefaultVideo = () => {
    const defaultVideoPath = '/2x.mp4';
    setVideoFile({ id: 'default', name: 'Default Video (Loading...)', url: '' });
    
    fetch(defaultVideoPath)
      .then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const defaultVideo = {
          id: 'default',
          name: 'Default Video',
          url: url
        };
        setVideoFile(defaultVideo);
      })
      .catch(error => {
        console.error('Error loading default video:', error);
        const defaultVideo = {
          id: 'default',
          name: 'Default Video (Fallback)',
          url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        };
        setVideoFile(defaultVideo);
      });
  };

  if (!videoFile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="edit-container">
      <h2>Edit Video: {videoFile.name}</h2>
      <button 
        className="back-button" 
        onClick={() => navigate('/')}
      >
        Back to Upload
      </button>
      
      <div className="edit-content">
        <div className="transcription-section">
          <TranscriptionPanel />
        </div>
        <VideoPanel />
      </div>
      
      <PlaybackControls />
      <AudioWaveform />
    </div>
  );
}

// Wrap the EditPage with the VideoEditorProvider
function EditPage() {
  return (
    <VideoEditorProvider>
      <EditPageContent />
    </VideoEditorProvider>
  );
}

export default EditPage; 