import React, { useEffect } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

function AudioWaveform() {
  const {
    videoRef,
    waveformRef,
    wavesurferRef,
    regionsPluginRef,
    videoFile,
    setCurrentTime,
    setDuration,
    trimHistory,
    transcription,
    findWordAtTime
  } = useVideoEditor();

  // Initialize WaveSurfer when video is loaded
  useEffect(() => {
    const initializeWaveSurfer = () => {
      if (!videoRef.current || !waveformRef.current || !videoFile?.url) return;
      
      // Destroy any existing instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      
      // Create new WaveSurfer instance with regions plugin
      const regionsPlugin = RegionsPlugin.create();
      // Store reference to the regions plugin
      regionsPluginRef.current = regionsPlugin;
      
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
        media: videoRef.current,
        plugins: [regionsPlugin]
      });
      
      // Enable drag selection to create regions
      regionsPlugin.enableDragSelection({
        color: 'rgba(79, 74, 133, 0.3)',
        handleStyle: {
          left: {
            backgroundColor: '#4F4A85'
          },
          right: {
            backgroundColor: '#4F4A85'
          }
        }
      });
      
      // Region event listeners
      regionsPlugin.on('region-created', region => {
        console.log('Region created:', region);
      });
      
      regionsPlugin.on('region-updated', region => {
        console.log('Region updated:', region);
      });

      // Add event listeners for main wavesurfer instance
      wavesurferRef.current.on('ready', () => {
        console.log('WaveSurfer is ready');
        if (videoRef.current) {
          setDuration(videoRef.current.duration);
        }
        
        // Sync waveform with video time updates
        videoRef.current.addEventListener('timeupdate', () => {
          const currentVideoTime = videoRef.current.currentTime;
          
          if (Math.abs(currentVideoTime - wavesurferRef.current.getCurrentTime()) > 0.5) {
            wavesurferRef.current.setCurrentTime(currentVideoTime);
          }
          
          setCurrentTime(currentVideoTime);
          
          // Check for current word in transcription
          if (transcription && findWordAtTime) {
            const currentWord = findWordAtTime(currentVideoTime);
            // You can use this to highlight the current word in your UI
          }
        });
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
  }, [videoFile, videoRef]);

  // Update region colors when trim history changes
  useEffect(() => {
    if (!regionsPluginRef.current) return;
    
    // Get all current regions from regions plugin
    const regions = regionsPluginRef.current.getRegions();
    
    // Update color of regions that are in trim history
    regions.forEach(region => {
      const isTrimmed = trimHistory.some(trim => trim.id === region.id);
      if (isTrimmed) {
        // Change color to indicate it's in trim history
        region.setOptions({
          color: 'rgba(220, 53, 69, 0.3)', // Red color for trimmed regions
          handleStyle: {
            left: { backgroundColor: '#dc3545' },
            right: { backgroundColor: '#dc3545' }
          }
        });
      }
    });
  }, [trimHistory]);

  return (
    <div className="audio-waveform">
      <h3>Audio Waveform</h3>
      <div 
        ref={waveformRef} 
        className="waveform-container"
      />
    </div>
  );
}

export default AudioWaveform; 