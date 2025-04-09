import React, { useEffect } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';
import WaveSurfer from 'wavesurfer.js';

function AudioWaveform() {
  const {
    videoRef,
    waveformRef,
    wavesurferRef,
    videoFile,
    setCurrentTime,
    setDuration
  } = useVideoEditor();

  // Initialize WaveSurfer when video is loaded
  useEffect(() => {
    const initializeWaveSurfer = () => {
      if (!videoRef.current || !waveformRef.current || !videoFile?.url) return;
      
      // Destroy any existing instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      
      // Create new WaveSurfer instance
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
        mediaControls: false,
        mediaType: 'video',
        media: videoRef.current
      });
      
      // Add event listeners
      wavesurferRef.current.on('ready', () => {
        console.log('WaveSurfer is ready');
        if (videoRef.current) {
          setDuration(videoRef.current.duration);
        }
      });
      
      wavesurferRef.current.on('audioprocess', () => {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
      });

      wavesurferRef.current.on('interaction', (progress) => {
        if (videoRef.current) {
          videoRef.current.currentTime = progress;
          setCurrentTime(progress);
        }
      });
    };

    // Initialize when video is ready
    if (videoFile?.url && videoRef.current && waveformRef.current) {
      const handleLoadedMetadata = () => {
        setTimeout(initializeWaveSurfer, 300);
        setDuration(videoRef.current.duration);
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      if (videoRef.current.readyState >= 1) {
        setTimeout(initializeWaveSurfer, 300);
      }
      
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

  return (
    <div className="audio-waveform">
      <h3>Audio Waveform</h3>
      <div 
        ref={waveformRef} 
        className="waveform-container"
        style={{ width: '100%', height: '80px' }}
      />
    </div>
  );
}

export default AudioWaveform; 