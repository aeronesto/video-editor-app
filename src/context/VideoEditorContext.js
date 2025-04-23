import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
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
  const [silenceThreshold, setSilenceThreshold] = useState(0.8);
  const videoRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsPluginRef = useRef(null);

  // Function to add unique items to trim history, avoiding duplicates
  const addUniqueTrimHistoryItems = useCallback((newItems) => {
    setTrimHistory(prevItems => {
      // Create a new array with existing items
      let allItems = [...prevItems];
      
      // Check each new item to see if it's already in the list
      newItems.forEach(newItem => {
        // Look for duplicates based on ID (exact match) and start/end times (close enough match)
        const isDuplicate = allItems.some(existingItem => 
          existingItem.id === newItem.id || 
          (Math.abs(existingItem.start - newItem.start) < 0.001 && 
           Math.abs(existingItem.end - newItem.end) < 0.001)
        );
        
        if (!isDuplicate) {
          allItems.push(newItem);
        } else {
          console.log(`Skipping duplicate trim: ${newItem.id}`);
        }
      });
      
      // Now handle overlapping items by merging them
      // First, sort all items by start time
      allItems.sort((a, b) => a.start - b.start);
      
      // Array to hold the final merged items
      const mergedItems = [];
      
      // If we have items to process
      if (allItems.length > 0) {
        // Start with the first item
        let currentMerged = { ...allItems[0] };
        
        // Process the rest of the items
        for (let i = 1; i < allItems.length; i++) {
          const nextItem = allItems[i];
          
          // Check if current merged item overlaps with the next item
          if (currentMerged.end >= nextItem.start) {
            currentMerged.end = Math.max(currentMerged.end, nextItem.end);
            currentMerged.start = Math.min(currentMerged.start, nextItem.start);
            // Create a new ID that shows this is a merged item
            currentMerged.id = `merged-${currentMerged.start.toFixed(3)}-${currentMerged.end.toFixed(3)}`;
            
            console.log(`Merged overlapping items into: ${currentMerged.id}`);
          } else {
            // No overlap, add the current merged item to the result
            mergedItems.push(currentMerged);
            // Start a new merged item
            currentMerged = { ...nextItem };
          }
        }
        
        // Add the last merged item
        mergedItems.push(currentMerged);
      }
      
      console.log(`Original items: ${allItems.length}, After merging: ${mergedItems.length}`);
      return mergedItems;
    });
  }, []);

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
    
    // Use the unique items function instead of directly calling setTrimHistory
    addUniqueTrimHistoryItems(newTrims);
    
    // Update regions to show they're trimmed (will be handled in AudioWaveform component)
    return newTrims;
  };

  // Function to detect silences based on transcription word timings
  const detectSilences = useCallback((threshold) => {
    if (!transcription || !transcription.segments || transcription.segments.length === 0) {
      console.log("Transcription data not available or empty.");
      return [];
    }

    const detectedSilences = [];
    let lastWordEndTime = 0; // Initialize with 0 for the gap before the very first word

    // Iterate through each segment
    transcription.segments.forEach((segment, segmentIndex) => {
      if (!segment.words || segment.words.length === 0) {
        // If a segment has no words, consider the entire segment duration as potential silence 
        // relative to the previous word or the start of the video.
        // This might need more nuanced handling depending on requirements.
        // For now, we only calculate gaps between words.
        console.warn(`Segment ${segment.id} has no word timestamps.`);
        return; // Skip segments without words for gap calculation
      }
      
      // Check gap between the last word of the previous segment and the first word of this segment
      if (segmentIndex > 0) {
           const prevSegment = transcription.segments[segmentIndex - 1];
           if (prevSegment.words && prevSegment.words.length > 0) {
               const lastWordOfPrevSegment = prevSegment.words[prevSegment.words.length - 1];
               const firstWordOfCurrentSegment = segment.words[0];
               const interSegmentGap = firstWordOfCurrentSegment.start - lastWordOfPrevSegment.end;

               if (interSegmentGap >= threshold) {
                   detectedSilences.push({
                       id: `silence-${lastWordOfPrevSegment.end.toFixed(3)}-${firstWordOfCurrentSegment.start.toFixed(3)}`,
                       start: lastWordOfPrevSegment.end,
                       end: firstWordOfCurrentSegment.start,
                       color: 'rgba(255, 165, 0, 0.3)', // Orange for silence regions
                       handleStyle: { left: { backgroundColor: '#FFA500' }, right: { backgroundColor: '#FFA500' } },
                       timestamp: new Date().toISOString()
                   });
               }
           }
      } else {
          // Potentially check gap from video start to the first word?
          const firstWord = segment.words[0];
          if (firstWord.start >= threshold) {
            detectedSilences.push({
              id: `silence-0-${firstWord.start.toFixed(3)}`,
              start: 0,
              end: firstWord.start,
              color: 'rgba(255, 165, 0, 0.3)', // Orange for silence regions
              handleStyle: { left: { backgroundColor: '#FFA500' }, right: { backgroundColor: '#FFA500' } },
              timestamp: new Date().toISOString()
            });
          } 
          // Let's only focus on gaps between words for now.
      }

      // Iterate through words within the current segment
      segment.words.forEach((word, wordIndex) => {
        if (wordIndex < segment.words.length - 1) {
          const nextWord = segment.words[wordIndex + 1];
          const gap = nextWord.start - word.end;

          if (gap >= threshold) {
            // Found a silence gap exceeding the threshold
            detectedSilences.push({
              id: `silence-${word.end.toFixed(3)}-${nextWord.start.toFixed(3)}`, // Unique ID based on times
              start: word.end,
              end: nextWord.start,
              color: 'rgba(255, 165, 0, 0.3)', // Orange color for silence regions
              handleStyle: { left: { backgroundColor: '#FFA500' }, right: { backgroundColor: '#FFA500' } },
              timestamp: new Date().toISOString() 
            });
          }
        }
        lastWordEndTime = word.end; // Update the end time of the last processed word
      });
    });
    
    // Check gap from the very last word to the end of the video (optional)
    if (transcription.segments.length > 0 && duration > 0) {
        const lastSegment = transcription.segments[transcription.segments.length - 1];
        if (lastSegment.words && lastSegment.words.length > 0) {
            const lastWord = lastSegment.words[lastSegment.words.length - 1];
            const finalGap = duration - lastWord.end;
            if (finalGap >= threshold) {
              // Found a silence gap exceeding the threshold
              detectedSilences.push({
                id: `silence-${lastWord.end.toFixed(3)}-${duration}`, // Unique ID based on times
                start: lastWord.end,
                end: duration,
                color: 'rgba(255, 165, 0, 0.3)', // Orange color for silence regions
                handleStyle: { left: { backgroundColor: '#FFA500' }, right: { backgroundColor: '#FFA500' } },
                timestamp: new Date().toISOString() 
              });
            }
        }
    }


    if (detectedSilences.length > 0) {
      console.log(`Detected ${detectedSilences.length} silence gaps >= ${threshold}s.`);
      // Use the unique items function instead of directly calling setTrimHistory
      addUniqueTrimHistoryItems(detectedSilences);
    } else {
      console.log(`No silence gaps found >= ${threshold}s.`);
    }
    
    return detectedSilences; // Return the detected silences

  }, [transcription, addUniqueTrimHistoryItems, duration]);

  // Manually trigger transcription for a video file
  const generateTranscription = useCallback(async (file = videoFile) => {
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
    addUniqueTrimHistoryItems,
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