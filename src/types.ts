/* eslint-disable @typescript-eslint/no-explicit-any */
// Disabling rule for WaveSurferInstance and RegionsPluginInstance until types are properly resolved

// Import types from wavesurfer.js
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type RegionParams } from 'wavesurfer.js/dist/plugins/regions.esm.js';

// General Type Aliases
export type WaveSurferInstance = WaveSurfer;
export type RegionsPluginInstance = RegionsPlugin;

// This represents the parameters used to create a region or the region object itself.
// We'll use RegionParams from the plugin.
export type Region = RegionParams & { id: string; data?: Record<string, any>; };

// Video File Structure
export interface VideoFile {
  id: string;
  name: string;
  url: string;
  originalFile?: File; // Optional: if the original File object needs to be stored
}

// Transcription Related Structures
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  score?: number; // Optional: confidence score for the word
}

export interface TranscriptionSegment {
  id: string; // Unique identifier for the segment
  start: number; // Start time of the segment in seconds
  end: number; // End time of the segment in seconds
  text: string; // Transcribed text of the segment
  words?: TranscriptionWord[]; // Optional: word-level details for the segment
}

export interface TranscriptionData {
  text: string; // Full transcription text for the entire media
  segments: TranscriptionSegment[]; // Array of transcription segments
  language?: string; // Optional: detected language of the transcription
  // Potentially add more metadata from WhisperX or other services if needed
}

// Options for Transcription Services
export interface TranscriptionOptions {
  model_name: string; // e.g., 'large-v2'
  align_model?: string; // e.g., 'WAV2VEC2_ASR_LARGE_LV60K_960H' (optional for some services)
  batch_size?: number;
  compute_type?: string; // e.g., 'int8', 'float32'
  highlight_words?: boolean;
  vad_onset?: number; // Voice Activity Detection onset
  language?: string; // Target language for transcription (if known)
}

// Structure for Trim History Items (also used for silence regions before they are processed by WaveSurfer)
export interface TrimHistoryItem {
  id: string; // Unique ID, can be region_id from WaveSurfer or generated for silences
  start: number; // Start time of the trim/silence in seconds
  end: number; // End time of the trim/silence in seconds
  timestamp: string; // ISO date string of when the item was created or added
  // Optional: for styling regions directly, though usually handled by WaveSurfer config or CSS
  color?: string; 
  handleStyle?: { 
    left?: { backgroundColor?: string }; 
    right?: { backgroundColor?: string }; 
  };
}

// Specific structure for silence regions if it needs to differ from TrimHistoryItem
// For now, detectSilencesCore returns objects compatible with TrimHistoryItem if color/handleStyle are added.
// If SilenceRegion needs to be strictly different, define it here.
// export interface SilenceRegion extends Omit<TrimHistoryItem, 'timestamp'> { // Example if timestamp not needed for pure silences
//   // any other silence-specific properties
// }

// Context value structure (already defined in VideoEditorContext.tsx, 
// but could be moved here if preferred and imported by the context)
// For now, keeping it in VideoEditorContext.tsx to avoid circular dependencies if context also imports other types from here. 