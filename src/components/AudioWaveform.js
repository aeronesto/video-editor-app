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
      
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4a90e2',
        progressColor: '#2c56dd',
        height: 80,
        cursorWidth: 2,
        cursorColor: '#ff0000',
        barWidth: 2,
        barGap: 1,
        barRadius: 3,
        normalize: true,
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
      wavesurfer.on('ready', () => {
        console.log('WaveSurfer is ready');
        if (videoRef.current) {
          setDuration(wavesurfer.getDuration());
        }
        
        // Sync waveform with video time updates
        videoRef.current.addEventListener('timeupdate', () => {
          const currentVideoTime = videoRef.current.currentTime;
          
          if (Math.abs(currentVideoTime - wavesurfer.getCurrentTime()) > 0.5) {
            wavesurfer.setCurrentTime(currentVideoTime);
          }
          
          setCurrentTime(currentVideoTime);
          
          // Check for current word in transcription
          if (transcription && findWordAtTime) {
            const currentWord = findWordAtTime(currentVideoTime);
            // You can use this to highlight the current word in your UI
          }
        });
      });
      
      // Update video time when waveform is seeked
      wavesurfer.on('seeking', (time) => {
        if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 0.5) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
        }
      });

      wavesurferRef.current = wavesurfer;
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
        style={{ width: '100%', height: '80px' }}
      />
    </div>
  );
}

export default AudioWaveform; 