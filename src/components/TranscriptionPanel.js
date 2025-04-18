import React, { useState, useEffect } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';

function TranscriptionPanel() {
  const { videoFile, transcription, transcriptionLoading, generateTranscription } = useVideoEditor();
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Skip if no video file or if already loading or if transcription already exists
    if (!videoFile || !videoFile.url || transcriptionLoading || (transcription && transcription.segments)) return;
    
    // Use the context's generateTranscription function instead of duplicating logic
    generateTranscription(videoFile).catch(err => {
      console.error('Error transcribing video:', err);
      setError(err.message);
    });
    
  }, [videoFile, generateTranscription, transcriptionLoading, transcription]);
  
  if (error) {
    return (
      <div className="transcription-panel">
        <h3>Transcription</h3>
        <div className="transcription-error">
          <p>Error: {error}</p>
          <p>Please check the console for more details.</p>
        </div>
      </div>
    );
  }
  
  if (transcriptionLoading) {
    return (
      <div className="transcription-panel">
        <h3>Transcription</h3>
        <div className="transcription-loading">
          <p>Generating transcription with WhisperX...</p>
          <p>This may take a few minutes.</p>
        </div>
      </div>
    );
  }
  
  if (!transcription || !transcription.segments) {
    return (
      <div className="transcription-panel">
        <h3>Transcription</h3>
        <div className="transcription-content">
          <p>No transcription available.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="transcription-panel">
      <h3>Transcription</h3>
      <div className="transcription-content">
        {transcription.segments.map((segment) => (
          <p key={segment.id} className="transcript-segment">
            {segment.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default TranscriptionPanel; 