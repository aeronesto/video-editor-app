import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../VideoUploader.css';
import WaveSurfer from 'wavesurfer.js';

function EditPage() {
  const [videoFile, setVideoFile] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mock transcription data
  const mockTranscription = `
    [00:00:01] Hello and welcome to this demonstration.
    [00:00:05] Today we're going to be talking about video editing.
    [00:00:10] As you can see, this interface allows for easy video manipulation.
    [00:00:15] The transcription appears on the left side.
    [00:00:20] And the video preview appears on the right.
    [00:00:25] Below both of these elements are the playback controls.
    [00:00:30] And finally, at the bottom is an audio waveform.
  `;

  // Load video data when component mounts
  useEffect(() => {
    // Get the videoId from URL query parameters
    const params = new URLSearchParams(location.search);
    const videoId = params.get('videoId');
    
    if (videoId) {
      // If videoId exists, load from localStorage
      const videos = JSON.parse(localStorage.getItem('videos') || '{}');
      const videoData = videos[videoId];
      
      if (videoData) {
        setVideoFile(videoData);
      } else {
        // If video data not found, load default
        loadDefaultVideo();
      }
    } else {
      // If no videoId in query params, load default
      loadDefaultVideo();
    }
  }, [location]);

  // Function to load default video
  const loadDefaultVideo = () => {
    // Path to local default video
    const defaultVideoPath = '/2x.mp4';
    
    // Create a loading state while fetching the file
    setVideoFile({ id: 'default', name: 'Default Video (Loading...)', url: '' });
    
    // Fetch the local file
    fetch(defaultVideoPath)
      .then(response => response.blob())
      .then(blob => {
        // Create an object URL from the blob
        const url = URL.createObjectURL(blob);
        
        const defaultVideo = {
          id: 'default',
          name: 'Default Video',
          url: url
        };
        
        setVideoFile(defaultVideo);
      })
      .catch(error => {
        console.error('Error loading default video:', error);
        // Fallback to a public URL if local file can't be loaded
        const defaultVideo = {
          id: 'default',
          name: 'Default Video (Fallback)',
          url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        };
        setVideoFile(defaultVideo);
      });
  };

  // Initialize WaveSurfer when video is loaded
  useEffect(() => {
    // Wait for video to be ready before initializing WaveSurfer
    const initializeWaveSurfer = () => {
      if (!videoRef.current || !waveformRef.current || !videoFile?.url) return;
      
      // Destroy any existing instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      
      // Create new WaveSurfer instance with media element option
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4F4A85',
        progressColor: '#383351',
        height: 80,
        responsive: true,
        cursorWidth: 2,
        cursorColor: '#333',
        barWidth: 2,
        barGap: 1,
        // Use the video element as the media element to avoid AbortError
        mediaControls: false,
        mediaType: 'video',
        media: videoRef.current
      });
      
      // Add error handler
      wavesurferRef.current.on('error', err => {
        console.warn('WaveSurfer error:', err);
      });
      
      // Sync video and wavesurfer
      wavesurferRef.current.on('ready', () => {
        console.log('WaveSurfer is ready');
      });
      
      wavesurferRef.current.on('seek', (progress) => {
        if (videoRef.current) {
          videoRef.current.currentTime = progress * videoRef.current.duration;
        }
      });
    };

    // Only initialize when both video element and video file are available
    if (videoFile?.url && videoRef.current && waveformRef.current) {
      // Add loadedmetadata event listener to initialize WaveSurfer after video metadata is loaded
      const handleLoadedMetadata = () => {
        // Small delay to ensure everything is ready
        setTimeout(initializeWaveSurfer, 300);
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // If metadata is already loaded, initialize immediately
      if (videoRef.current.readyState >= 1) {
        setTimeout(initializeWaveSurfer, 300);
      }
      
      // Clean up
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
        
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      };
    }
  }, [videoFile]);

  // Sync video time updates with waveform
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(video.currentTime / video.duration);
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

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
  
  // Format time in MM:SS format
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Wait for videoFile to be loaded
  if (!videoFile) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="edit-container">
      <h2>Edit Video: {videoFile.name}</h2>
      <button 
        className="back-button" 
        onClick={() => {
          navigate('/');
        }}
      >
        Back to Upload
      </button>
      
      <div className="edit-content">
        <div className="transcription-panel">
          <h3>Transcription</h3>
          <div className="transcription-content">
            {mockTranscription.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
        
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
      </div>
      
      <div className="playback-controls">
        <button onClick={togglePlayPause}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input 
          type="range" 
          className="timeline-slider"
          min="0" 
          max={duration || 100}
          value={currentTime || 0}
          onChange={(e) => {
            if (videoRef.current) {
              const newTime = parseFloat(e.target.value);
              videoRef.current.currentTime = newTime;
              setCurrentTime(newTime);
              
              wavesurferRef.current?.seekTo(newTime / videoRef.current.duration);
            }
          }}
        />
      </div>
      
      <div className="audio-waveform">
        <h3>Audio Waveform</h3>
        <div 
          ref={waveformRef} 
          className="waveform-container"
          style={{ width: '100%', height: '80px' }}
        >
          {/* WaveSurfer will render here */}
        </div>
      </div>
    </div>
  );
}

export default EditPage; 