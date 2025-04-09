import React, { useEffect } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';

function VideoPanel() {
  const {
    videoFile,
    videoRef,
    setPlaying,
  } = useVideoEditor();

  if (!videoFile) {
    return <div>Loading video...</div>;
  }

  return (
    <div className="video-panel">
      <h3>Video Preview</h3>
      <video 
        ref={videoRef}
        src={videoFile.url} 
        className="video-preview"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}

export default VideoPanel; 