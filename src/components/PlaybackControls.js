import React from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';

function PlaybackControls() {
  const {
    playing,
    currentTime,
    duration,
    togglePlayPause,
    formatTime
  } = useVideoEditor();

  return (
    <div className="playback-controls">
      <button onClick={togglePlayPause}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <span className="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

export default PlaybackControls; 