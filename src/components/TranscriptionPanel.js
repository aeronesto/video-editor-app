import React from 'react';

// Mock transcription data - in a real app, this would come from props or an API
const mockTranscription = `
  [00:00:01] Hello and welcome to this demonstration.
  [00:00:05] Today we're going to be talking about video editing.
  [00:00:10] As you can see, this interface allows for easy video manipulation.
  [00:00:15] The transcription appears on the left side.
  [00:00:20] And the video preview appears on the right.
  [00:00:25] Below both of these elements are the playback controls.
  [00:00:30] And finally, at the bottom is an audio waveform.
`;

function TranscriptionPanel() {
  return (
    <div className="transcription-panel">
      <h3>Transcription</h3>
      <div className="transcription-content">
        {mockTranscription.split('\n').map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export default TranscriptionPanel; 