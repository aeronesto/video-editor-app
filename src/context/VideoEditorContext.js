import React, { createContext, useContext, useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

const VideoEditorContext = createContext();

export function VideoEditorProvider({ children }) {
  const [videoFile, setVideoFile] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimHistory, setTrimHistory] = useState([]);
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