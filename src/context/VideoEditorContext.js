import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { formatTime, mergeTrimItems, detectSilencesCore } from '../utils';
import { transcribeBlob, transcribeFile } from '../services';

const VideoEditorContext = createContext();

export function VideoEditorProvider({ children }) {
  const [videoFile, setVideoFile] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimHistory, setTrimHistory] = useState([]);
  const [transcription, setTranscription] = useState(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(0.7);
  const videoRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsPluginRef = useRef(null);



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
    // Merge into history
    setTrimHistory(prev => mergeTrimItems(prev, newTrims));
    return newTrims;
  };

  // Function to detect silences based on transcription word timings
  // Detect silences via utility and merge into history
  const detectSilences = useCallback((threshold) => {
    const silences = detectSilencesCore(transcription, duration, threshold);
    if (silences.length > 0) {
      console.log(`Detected ${silences.length} silence gaps >= ${threshold}s.`);
      setTrimHistory(prev => mergeTrimItems(prev, silences));
    } else {
      console.log(`No silence gaps found >= ${threshold}s.`);
    }
    return silences;
  }, [transcription, duration]);

  // Manually trigger transcription for a video file
  const generateTranscription = useCallback(async (file = videoFile) => {
    if (!file?.url) {
      console.error('No video file to transcribe');
      return;
    }
    setTranscriptionLoading(true);
    try {
      let data;
      if (file.url.startsWith('blob:')) {
        data = await transcribeBlob(file.url, file.name || 'video.mp4');
      } else {
        data = await transcribeFile(file.url, {});
      }
      setTranscription(data);
    } catch (err) {
      console.error('Error transcribing video:', err);
    } finally {
      setTranscriptionLoading(false);
    }
  }, [videoFile]);

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
    addTrimsToHistory,
    detectSilences,
    silenceThreshold,
    setSilenceThreshold,
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