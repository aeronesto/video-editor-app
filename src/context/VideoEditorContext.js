import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { formatTime, mergeTrimItems, detectSilencesCore, adjustSilencesWithPadding } from '../utils';
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

  // WhisperX transcription parameters for accurate word-level timestamps
  const transcriptionOptions = {
    model_name: 'large-v2',
    align_model: 'WAV2VEC2_ASR_LARGE_LV60K_960H',
    batch_size: 4,
    compute_type: 'int8',
    highlight_words: true,
    vad_onset: 0.45
  };

  const handleZoom = useCallback((level) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(level);
    }
  }, []);

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

  // Function to remove a specific trim item from the history
  const removeTrimFromHistory = useCallback((trimIdToRemove) => {
    setTrimHistory(prevTrimHistory => {
      const updatedHistory = prevTrimHistory.filter(trim => trim.id !== trimIdToRemove);
      console.log(`Removed trim ${trimIdToRemove}. New history:`, updatedHistory);
      return updatedHistory;
    });
  }, []);

  // Function to detect silences based on transcription word timings
  // Detect silences via utility and merge into history
  const detectSilences = useCallback((threshold) => {
    const rawSilences = detectSilencesCore(transcription, duration, threshold);
    
    // Define the padding amount (0.05 seconds).
    const padding = 0.2;
    // Adjust the raw silences by adding the defined padding.
    // This helps prevent cutting off speech by making silence regions slightly shorter.
    const adjustedSilences = adjustSilencesWithPadding(rawSilences, padding);
    
    if (adjustedSilences.length > 0) {
      console.log(`Detected ${adjustedSilences.length} silence gaps >= ${threshold}s (after padding).`);
      setTrimHistory(prev => mergeTrimItems(prev, adjustedSilences));
    } else {
      console.log(`No silence gaps found >= ${threshold}s (after padding).`);
    }
    return adjustedSilences;
  }, [transcription, duration]);

  // Manually trigger transcription for a video file
  const generateTranscription = useCallback(async (file = videoFile, options = {}) => {
    if (!file?.url) {
      console.error('No video file to transcribe');
      return;
    }
    setTranscriptionLoading(true);
    try {
      let data;
      // Merge default options with any custom options
      const transcribeOptions = { ...transcriptionOptions, ...options };
      
      if (file.url.startsWith('blob:')) {
        data = await transcribeBlob(file.url, file.name || 'video.mp4', transcribeOptions);
      } else {
        data = await transcribeFile(file.url, transcribeOptions);
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
    removeTrimFromHistory,
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
    togglePlayPause,
    transcriptionOptions,
    handleZoom
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