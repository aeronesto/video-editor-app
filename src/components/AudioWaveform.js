import React, { useEffect } from 'react';
import { useVideoEditor } from '../context/VideoEditorContext';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';

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
    findWordAtTime,
    removeTrimFromHistory
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
      
      const minimapPlugin = MinimapPlugin.create({
        height: 20,
        waveColor: '#ddd',
        progressColor: '#999',
        cursorColor: '#333'
      });
      
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
        plugins: [regionsPlugin, minimapPlugin]
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

        // Create a delete icon
        const deleteIcon = document.createElement('span');
        deleteIcon.innerHTML = '✖'; // Simple text icon
        deleteIcon.className = 'region-delete-icon'; // For CSS styling
        
        // Inline styles removed, will be handled by CSS class 'region-delete-icon'

        // Append the icon directly to the region's main element.
        // This ensures its absolute positioning is relative to the entire region.
        region.element.appendChild(deleteIcon);

        // Add click event listener to the icon
        deleteIcon.addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent region click or other events
          console.log('Delete icon clicked for region:', region.id);
          removeTrimFromHistory(region.id);
        });

        // Optional: If you want to ensure the icon is re-added if the region element is ever re-rendered by Wavesurfer
        // you might need to also use 'region-updated' or manage this more directly if regions are fully replaced.
        // However, since trimHistory drives region creation, this should be sufficient for deletions.
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

  // Handle trim history changes - create new regions and update existing ones
  useEffect(() => {
    try {
      if (!regionsPluginRef.current || !wavesurferRef.current) return;
      console.log('wavesurferRef.current.isReady', wavesurferRef.current.isReady);

      
      // Make sure wavesurfer is ready before adding regions
      if (!wavesurferRef.current) {
        const handleReady = () => {
          handleTrimHistoryChange();
          wavesurferRef.current.un('ready', handleReady);
        };
        
        wavesurferRef.current.on('ready', handleReady);
        return;
      }
      
      handleTrimHistoryChange();
    } catch (error) {
      console.error('Error handling trim history changes:', error);
    }
    
    function handleTrimHistoryChange() {
      console.log('handleTrimHistoryChange');
      // Get existing regions to work with
      const existingRegions = regionsPluginRef.current.getRegions();

      existingRegions.forEach(region => {
        region.remove();
      });
      
      // Create regions for trim history items
      trimHistory.forEach(trim => {
        // Create a new region using the trim data
        const regionOptions = {
          id: trim.id,
          start: trim.start,
          end: trim.end,
          color: trim.color || 'rgba(220, 53, 69, 0.3)', // Use provided color or default to red
          handleStyle: trim.handleStyle || {
            left: { backgroundColor: '#dc3545' },
            right: { backgroundColor: '#dc3545' }
          }
        };
        
        // Add the region to the waveform
        regionsPluginRef.current.addRegion(regionOptions);
        console.log(`Created region for trim history item: ${trim.id}`);
      });
    }
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