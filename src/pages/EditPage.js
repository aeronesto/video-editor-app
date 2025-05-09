import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VideoEditorProvider, useVideoEditor } from '../context/VideoEditorContext';
import TranscriptionPanel from '../components/TranscriptionPanel';
import VideoPanel from '../components/VideoPanel';
import PlaybackControls from '../components/PlaybackControls';
import AudioWaveform from '../components/AudioWaveform';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

function EditPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    videoFile, 
    setVideoFile,
    setTranscription 
  } = useVideoEditor();

  // Load video data when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const video_id = params.get('video_id');
    
    if (video_id) {
      // NEW: Fetch video from backend
      console.log(`Fetching video with ID: ${video_id}`);
      fetch(`${BASE_URL}/video/${video_id}`) // Assuming backend runs on port 8000
        .then(response => {
          if (!response.ok) {
            if (response.status === 404) {
              console.error(`Video with ID ${video_id} not found on server.`);
            } else {
              console.error(`Error fetching video ${video_id}: ${response.status} ${response.statusText}`);
            }
            throw new Error(`Server error: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          const videoUrl = URL.createObjectURL(blob);
          // We need a name for the video. We can try to get it from Content-Disposition header if backend sends it,
          // or use a placeholder.
          // For now, using a placeholder name based on video_id.
          const fetchedVideoFile = {
            id: video_id,
            name: `Video ${video_id}`, // Placeholder name
            url: videoUrl,
          };
          setVideoFile(fetchedVideoFile);
          // If transcription is tied to the video, you might want to load it here as well.
          // For now, let's assume default transcription is okay or handled elsewhere.
          loadDefaultTranscription(); // Or a specific one if backend provides info
        })
        .catch(error => {
          console.error('Error fetching video from backend or processing blob:', error);
          // Fallback to default video if fetching fails
          alert(`Could not load video: ${video_id}. Loading default video instead.`);
          loadDefaultVideo();
        });
    } else {
      // No video_id in URL, load default video
      loadDefaultVideo();
    }
  }, [location, setVideoFile]); // Added setTranscription to dependency array as loadDefaultTranscription uses it

  // Function to load default transcription
  const loadDefaultTranscription = () => {
    const defaultTranscriptionPath = '/transcription.json';
    
    fetch(defaultTranscriptionPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Setting default transcription:", data); 
        setTranscription(data);
      })
      .catch(error => {
        console.error('Error loading default transcription:', error);
        setTranscription(null); 
      });
  };

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
        loadDefaultTranscription(); 
      })
      .catch(error => {
        console.error('Error loading default video:', error);
        const defaultVideo = {
          id: 'default',
          name: 'Default Video (Fallback)',
          url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        };
        setVideoFile(defaultVideo);
        loadDefaultTranscription(); 
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