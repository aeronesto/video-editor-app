import React, { createContext, useContext, useState, useRef, useCallback, ReactNode, useMemo } from 'react';
// WaveSurfer import remains, as it's a library, not a local type
// import WaveSurfer from 'wavesurfer.js'; 
import { formatTime, mergeTrimItems, detectSilencesCore, adjustSilencesWithPadding } from '../utils';
import { transcribeBlob, transcribeFile } from '../services/transcribeService';
import {
  VideoFile,
  TranscriptionWord,
  TranscriptionSegment,
  TranscriptionData,
  TrimHistoryItem,
  TranscriptionOptions,
  WaveSurferInstance,
  RegionsPluginInstance
} from '../types'; // Changed from ../types.js

// --- Type Definitions --- (All local definitions below will be removed)
// REMOVE: WaveSurferInstance, RegionsPluginInstance, VideoFile, TranscriptionWord, 
// REMOVE: TranscriptionSegment, TranscriptionData, TrimHistoryItem, local TranscriptionOptions interface

// Context Value Interface - This remains here as it's specific to this context
interface VideoEditorContextValue {
  videoFile: VideoFile | null;
  setVideoFile: React.Dispatch<React.SetStateAction<VideoFile | null>>;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  trimHistory: TrimHistoryItem[];
  setTrimHistory: React.Dispatch<React.SetStateAction<TrimHistoryItem[]>>;
  addTrimsToHistory: () => TrimHistoryItem[] | undefined;
  removeTrimFromHistory: (trimIdToRemove: string) => void;
  transcription: TranscriptionData | null;
  setTranscription: React.Dispatch<React.SetStateAction<TranscriptionData | null>>;
  transcriptionLoading: boolean;
  setTranscriptionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  silenceThreshold: number;
  setSilenceThreshold: React.Dispatch<React.SetStateAction<number>>;
  detectSilences: (threshold: number) => TrimHistoryItem[] | undefined;
  generateTranscription: (file?: VideoFile | null, options?: Partial<TranscriptionOptions>) => Promise<void>; // file can be null
  findWordAtTime: (time: number) => TranscriptionWord | { segment: TranscriptionSegment } | null;
  videoRef: { readonly current: HTMLVideoElement | null };
  waveformRef: { readonly current: HTMLDivElement | null };
  wavesurferRef: React.MutableRefObject<WaveSurferInstance | null>;
  regionsPluginRef: React.MutableRefObject<RegionsPluginInstance | null>;
  formatTime: (timeInSeconds: number) => string; 
  togglePlayPause: () => void;
  transcriptionOptions: TranscriptionOptions; // This will use the imported TranscriptionOptions
  handleZoom: (level: number) => void;
}

const VideoEditorContext = createContext<VideoEditorContextValue | undefined>(undefined);

interface VideoEditorProviderProps {
  children: ReactNode;
}

export function VideoEditorProvider({ children }: VideoEditorProviderProps) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [trimHistory, setTrimHistory] = useState<TrimHistoryItem[]>([]);
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState<boolean>(false);
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.7);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const regionsPluginRef = useRef<RegionsPluginInstance | null>(null);

  // This uses the imported TranscriptionOptions. Ensure its definition in types.ts is complete.
  const currentTranscriptionOptions: TranscriptionOptions = useMemo(() => ({
    model_name: 'large-v2', // Required by the imported TranscriptionOptions
    // Optional fields from imported TranscriptionOptions can be added or omitted
    align_model: 'WAV2VEC2_ASR_LARGE_LV60K_960H',
    batch_size: 4,
    compute_type: 'int8',
    highlight_words: true,
    vad_onset: 0.45
    // language field is optional in types.ts, so not required here unless used
  }), []);

  const handleZoom = useCallback((level: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(level);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        wavesurferRef.current?.pause();
      } else {
        videoRef.current.play();
        wavesurferRef.current?.play();
      }
      setPlaying(prevPlaying => !prevPlaying);
    }
  }, [playing]);

  const addTrimsToHistory = useCallback((): TrimHistoryItem[] | undefined => {
    if (!wavesurferRef.current || !regionsPluginRef.current) {
      console.error("WaveSurfer or Regions plugin not initialized");
      return undefined;
    }
    
    const currentRegions = regionsPluginRef.current.getRegions();
    const regionsArray: any[] = Array.isArray(currentRegions) ? currentRegions : Object.values(currentRegions);

    if (regionsArray.length === 0) {
      console.log("No regions found to trim");
      return undefined;
    }
    
    const newTrims: TrimHistoryItem[] = regionsArray.map((region: any) => ({
      id: region.id,
      start: region.start,
      end: region.end,
      timestamp: new Date().toISOString(),
      // color and handleStyle are optional in TrimHistoryItem from types.ts
    }));

    setTrimHistory(prev => mergeTrimItems(prev, newTrims)); 
    return newTrims;
  }, []);

  const removeTrimFromHistory = useCallback((trimIdToRemove: string) => {
    setTrimHistory(prevTrimHistory => {
      const updatedHistory = prevTrimHistory.filter(trim => trim.id !== trimIdToRemove);
      console.log(`Removed trim ${trimIdToRemove}. New history:`, updatedHistory);
      return updatedHistory;
    });
  }, []);

  const detectSilences = useCallback((threshold: number): TrimHistoryItem[] | undefined => {
    if (!transcription) {
        console.log("No transcription available to detect silences.");
        return undefined;
    }
    // detectSilencesCore now returns SilenceRegion[] which should be compatible with TrimHistoryItem[]
    // if SilenceRegion definition in types.ts is a superset or compatible with TrimHistoryItem for these fields.
    // Let's assume detectSilencesCore returns something that can be used as TrimHistoryItem[]
    const detectedRawSilences = detectSilencesCore(transcription, duration, threshold);
    const padding = 0.2;

    // Ensure detectedRawSilences items are fully compatible with TrimHistoryItem for mergeTrimItems
    const silencesAsTrimItems: TrimHistoryItem[] = adjustSilencesWithPadding(detectedRawSilences, padding).map((s: TrimHistoryItem) => ({
        id: s.id || `silence-${s.start}-${s.end}-${Math.random().toString(36).substr(2, 9)}`,
        start: s.start,
        end: s.end,
        timestamp: s.timestamp || new Date().toISOString(), // Ensure timestamp
        color: s.color, // Pass along color if present
        handleStyle: s.handleStyle // Pass along handleStyle if present
    }));
    
    if (silencesAsTrimItems.length > 0) {
      console.log(`Detected ${silencesAsTrimItems.length} silence gaps >= ${threshold}s (after padding).`);
      setTrimHistory(prev => mergeTrimItems(prev, silencesAsTrimItems));
    } else {
      console.log(`No silence gaps found >= ${threshold}s (after padding).`);
    }
    return silencesAsTrimItems;
  }, [transcription, duration]);

  const generateTranscription = useCallback(async (file: VideoFile | null = videoFile, options: Partial<TranscriptionOptions> = {}) => {
    const currentFile = file || videoFile;
    if (!currentFile?.url) {
      console.error('No video file to transcribe');
      return;
    }
    setTranscriptionLoading(true);
    try {
      let data: TranscriptionData | undefined;
      // Use the imported TranscriptionOptions, ensure options align
      const effectiveOptions: Partial<TranscriptionOptions> = {
         // Start with defaults from context if any, then apply passed options
        model_name: currentTranscriptionOptions.model_name, // default from context
        align_model: currentTranscriptionOptions.align_model,
        batch_size: currentTranscriptionOptions.batch_size,
        compute_type: currentTranscriptionOptions.compute_type,
        highlight_words: currentTranscriptionOptions.highlight_words,
        vad_onset: currentTranscriptionOptions.vad_onset,
        language: currentTranscriptionOptions.language,
        ...options, // Override with any explicitly passed options
      };
      
      if (currentFile.url.startsWith('blob:')) {
        data = await transcribeBlob(currentFile.url, currentFile.name || 'video.mp4', effectiveOptions) as TranscriptionData | undefined;
      } else {
        data = await transcribeFile(currentFile.url, effectiveOptions) as TranscriptionData | undefined;
      }
      if (data) setTranscription(data);
      else setTranscription(null);

    } catch (err: any) {
      console.error('Error transcribing video:', err);
      setTranscription(null);
    } finally {
      setTranscriptionLoading(false);
    }
  }, [videoFile, currentTranscriptionOptions]);

  const findWordAtTime = useCallback((time: number): TranscriptionWord | { segment: TranscriptionSegment } | null => {
    if (!transcription || !transcription.segments) return null;
    
    for (const segment of transcription.segments) {
      if (time >= segment.start && time <= segment.end) {
        if (segment.words) {
          for (const word of segment.words) {
            if (typeof word.start === 'number' && typeof word.end === 'number' && time >= word.start && time <= word.end) {
              return word;
            }
          }
        }
        return { segment };
      }
    }
    return null;
  }, [transcription]);

  const value: VideoEditorContextValue = {
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
    transcriptionOptions: currentTranscriptionOptions, // Use the state/constant from provider
    handleZoom
  };

  return (
    <VideoEditorContext.Provider value={value}>
      {children}
    </VideoEditorContext.Provider>
  );
}

export function useVideoEditor(): VideoEditorContextValue {
  const context = useContext(VideoEditorContext);
  if (context === undefined) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
} 