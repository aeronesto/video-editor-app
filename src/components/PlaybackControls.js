import React from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';

function PlaybackControls() {
  const {
    playing,
    currentTime,
    duration,
    togglePlayPause,
    formatTime,
    addTrimsToHistory
  } = useVideoEditor();

  const handleTrim = () => {
    const newTrims = addTrimsToHistory();
    if (newTrims && newTrims.length > 0) {
      console.log('Added trims to history:', newTrims);
    } else {
      console.log('No regions to trim');
    }
  };

  return (
    <div className="playback-controls">
      <button onClick={togglePlayPause}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button onClick={handleTrim} className="trim-button">
        Trim
      </button>
      <span className="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

export default PlaybackControls; 