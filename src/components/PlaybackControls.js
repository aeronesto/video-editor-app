import React, { useState } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';

function PlaybackControls() {
  const {
    playing,
    currentTime,
    duration,
    togglePlayPause,
    formatTime,
    addTrimsToHistory,
    detectSilences,
    silenceThreshold: defaultSilenceThreshold
  } = useVideoEditor();

  const [localSilenceThreshold, setLocalSilenceThreshold] = useState(defaultSilenceThreshold);

  const handleTrim = () => {
    const newTrims = addTrimsToHistory();
    if (newTrims && newTrims.length > 0) {
      console.log('Added trims to history:', newTrims);
    } else {
      console.log('No regions to trim');
    }
  };

  const handleDetectSilences = () => {
    const threshold = parseFloat(localSilenceThreshold);
    if (isNaN(threshold) || threshold < 0) {
      console.error("Invalid silence threshold value.");
      alert("Please enter a valid positive number for the silence threshold.");
      return;
    }
    detectSilences(threshold);
  };

  return (
    <div className="playback-controls">
      <button onClick={togglePlayPause}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button onClick={handleTrim} className="trim-button">
        Trim
      </button>
      <div className="silence-detection-controls">
        <label htmlFor="silence-threshold">Silence Threshold (s):</label>
        <input 
          type="number"
          id="silence-threshold"
          name="silence-threshold"
          min="0.1" 
          step="0.1"
          value={localSilenceThreshold}
          onChange={(e) => setLocalSilenceThreshold(e.target.value)} 
          className="silence-threshold-input"
        />
        <button onClick={handleDetectSilences} className="detect-silence-button">
          Detect Silences
        </button>
      </div>
      <span className="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

export default PlaybackControls; 