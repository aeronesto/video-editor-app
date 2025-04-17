import React, { useState, useEffect } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';

function TranscriptionPanel() {
  const { videoFile, setTranscription, transcription, transcriptionLoading } = useVideoEditor();
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!videoFile || !videoFile.url) return;
    
    async function fetchTranscription() {
      try {
        // Check if the video file is a Blob with a URL
        if (videoFile.url.startsWith('blob:')) {
          // Fetch the blob data
          const response = await fetch(videoFile.url);
          const blob = await response.blob();
          
          // Create a FormData object to send the file
          const formData = new FormData();
          formData.append('file', blob, videoFile.name || 'video.mp4');
          
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
        } else if (videoFile.url.startsWith('/')) {
          // For static files in the public directory
          // Send a request to transcribe the file on the server
          const transcriptionResponse = await fetch('http://localhost:8000/transcribe-file/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_path: `../public${videoFile.url}`,
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
        setError(err.message);
      }
    }
    
    fetchTranscription();
  }, [videoFile, setTranscription]);
  
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
          <p>No transcription available. Click the "Transcribe" button below to generate one.</p>
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