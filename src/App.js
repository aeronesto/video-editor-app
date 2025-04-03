import React from 'react';
import './App.css';
import VideoUploader from './VideoUploader';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Video Editor App</h1>
      </header>
      <main>
        <VideoUploader />
      </main>
    </div>
  );
}

export default App; 