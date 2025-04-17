import React, { createContext, useContext, useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

const VideoEditorContext = createContext();

export function VideoEditorProvider({ children }) {
  const [videoFile, setVideoFile] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimHistory, setTrimHistory] = useState([]);
  const [transcription, setTranscription] = useState(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const videoRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsPluginRef = useRef(null);

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds && timeInSeconds !== 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        wavesurferRef.current?.pause();
      } else {
        videoRef.current.play();
        wavesurferRef.current?.play();
      }
      setPlaying(!playing);
    }
  };

  const addTrimsToHistory = () => {
    if (!wavesurferRef.current || !regionsPluginRef.current) {
      console.error("WaveSurfer or Regions plugin not initialized");
      return;
    }
    
    // Get all current regions from the plugin
    const regions = regionsPluginRef.current.getRegions();
    
    if (regions.length === 0) {
      console.log("No regions found to trim");
      return;
    }
    
    // Add selected regions to history and mark them as trimmed
    const newTrims = regions.map(region => ({
      id: region.id,
      start: region.start,
      end: region.end,
      timestamp: new Date().toISOString()
    }));
    
    setTrimHistory(prev => [...prev, ...newTrims]);
    
    // Update regions to show they're trimmed (will be handled in AudioWaveform component)
    return newTrims;
  };

  // Manually trigger transcription for a video file
  const generateTranscription = async (file = videoFile) => {
    if (!file || !file.url) {
      console.error("No video file to transcribe");
      return;
    }

    setTranscriptionLoading(true);

    try {
      // Check if the video file is a Blob with a URL
      if (file.url.startsWith('blob:')) {
        // Fetch the blob data
        const response = await fetch(file.url);
        const blob = await response.blob();
        
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append('file', blob, file.name || 'video.mp4');
        
        // Send the request to the backend
        const transcriptionResponse = await fetch('http://localhost:8000/transcribe/', {
          method: 'POST',
          body: formData,
        });
        
        if (!transcriptionResponse.ok) {
          const errorData = await transcriptionResponse.json();
          throw new Error(errorData.detail || 'Failed to transcribe video');
        }
        
        const data = await transcriptionResponse.json();
        setTranscription(data);
      } else if (file.url.startsWith('/')) {
        // For static files in the public directory
        // Send a request to transcribe the file on the server
        const transcriptionResponse = await fetch('http://localhost:8000/transcribe-file/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_path: `../public${file.url}`,
            model_name: 'medium',
            compute_type: 'float32',
            batch_size: 8
          }),
        });
        
        if (!transcriptionResponse.ok) {
          const errorData = await transcriptionResponse.json();
          throw new Error(errorData.detail || 'Failed to transcribe video');
        }
        
        const data = await transcriptionResponse.json();
        setTranscription(data);
      }
    } catch (err) {
      console.error('Error transcribing video:', err);
      // You might want to set an error state here
    } finally {
      setTranscriptionLoading(false);
    }
  };

  // Find the word at a specific time in the transcription
  const findWordAtTime = (time) => {
    if (!transcription || !transcription.segments) return null;
    
    for (const segment of transcription.segments) {
      if (time >= segment.start && time <= segment.end) {
        if (segment.words) {
          for (const word of segment.words) {
            if (time >= word.start && time <= word.end) {
              return word;
            }
          }
        }
        // If no specific word is found but we're in a segment
        return { segment };
      }
    }
    return null;
  };

  const value = {
    videoFile,
    setVideoFile,
    playing,
    setPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    trimHistory,
    setTrimHistory,
    addTrimsToHistory,
    transcription,
    setTranscription,
    transcriptionLoading,
    setTranscriptionLoading,
    generateTranscription,
    findWordAtTime,
    videoRef,
    waveformRef,
    wavesurferRef,
    regionsPluginRef,
    formatTime,
    togglePlayPause
  };

  return (
    <VideoEditorContext.Provider value={value}>
      {children}
    </VideoEditorContext.Provider>
  );
}

export function useVideoEditor() {
  const context = useContext(VideoEditorContext);
  if (!context) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
} 