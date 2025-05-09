import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VideoEditorProvider, useVideoEditor } from '../context/VideoEditorContext';
import TranscriptionPanel from '../components/TranscriptionPanel';
import VideoPanel from '../components/VideoPanel';
import PlaybackControls from '../components/PlaybackControls';
import AudioWaveform from '../components/AudioWaveform';
import { VideoFile, TranscriptionData } from '../types'; // Changed from ../types.js

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const EditPageContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    videoFile, 
    setVideoFile,
    setTranscription 
  } = useVideoEditor(); // No longer need to explicitly type here if useVideoEditor is correctly typed and returns VideoEditorContextValue

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const video_id = params.get('video_id');
    
    if (video_id) {
      console.log(`Fetching video with ID: ${video_id}`);
      fetch(`${BASE_URL}/video/${video_id}`)
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
          const fetchedVideoFile: VideoFile = { // Uses imported VideoFile
            id: video_id,
            name: `Video ${video_id}`,
            url: videoUrl,
          };
          setVideoFile(fetchedVideoFile);
          loadDefaultTranscription();
        })
        .catch(error => {
          console.error('Error fetching video from backend or processing blob:', error);
          alert(`Could not load video: ${video_id}. Loading default video instead.`);
          loadDefaultVideo();
        });
    } else {
      loadDefaultVideo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, setVideoFile, setTranscription]); // Added setTranscription to deps as loadDefaultTranscription uses it.

  const loadDefaultTranscription = () => {
    const defaultTranscriptionPath = '/transcription.json';
    fetch(defaultTranscriptionPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: TranscriptionData) => { // Uses imported TranscriptionData
        console.log("Setting default transcription:", data); 
        setTranscription(data);
      })
      .catch(error => {
        console.error('Error loading default transcription:', error);
        setTranscription(null); 
      });
  };

  const loadDefaultVideo = () => {
    const defaultVideoPath = '/2x.mp4';
    setVideoFile({ id: 'default', name: 'Default Video (Loading...)', url: '' }); 
    fetch(defaultVideoPath)
      .then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const defaultVideo: VideoFile = { // Uses imported VideoFile
          id: 'default',
          name: 'Default Video',
          url: url
        };
        setVideoFile(defaultVideo);
        loadDefaultTranscription(); 
      })
      .catch(error => {
        console.error('Error loading default video:', error);
        const fallbackVideo: VideoFile = { // Uses imported VideoFile
          id: 'default',
          name: 'Default Video (Fallback)',
          url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        };
        setVideoFile(fallbackVideo);
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

const EditPage: React.FC = () => {
  return (
    <VideoEditorProvider>
      <EditPageContent />
    </VideoEditorProvider>
  );
}

export default EditPage; 