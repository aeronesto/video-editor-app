import React, { useState } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';
// Types like TranscriptionSegment should come from useVideoEditor's return value's 'transcription' field.

interface TranscriptionPanelProps {}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = () => {
  const {
    transcription,
    transcriptionLoading,
    // videoFile, // Was unused by active code
    // generateTranscription, // Was unused by active code
    // setCurrentTime, // Removing as per lint
    // wavesurferRef,  // Removing as per lint
    // videoRef,       // Removing as per lint
  } = useVideoEditor();

  const [error] = useState<string | null>(null); // setError was unused

  // TODO: Enable this when we want to fetch the transcription from the back end.
  // useEffect(() => {
  //   // Skip if no video file or if already loading or if transcription already exists
  //   if (!videoFile || !videoFile.url || transcriptionLoading || (transcription && transcription.segments)) return;
    
  //   // Use the context's generateTranscription function instead of duplicating logic
  //   generateTranscription(videoFile).catch(err => {
  //     console.error('Error transcribing video:', err);
  //     setError(err.message);
  //   });
    
  // }, [videoFile, generateTranscription, transcriptionLoading, transcription, setError]); // Added setError if it were used
  
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
        {transcription.segments.map((segment) => ( // Type for 'segment' will be inferred
          <p key={segment.id} className="transcript-segment">
            {segment.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default TranscriptionPanel; 