// ui/controls.js - main UI orchestrator

import { initMIDIUI } from './midi-controls.js';
import { initParameterControls } from './parameter-controls.js';
import { initKeyboard } from './keyboard.js';

export function initUI({ synth, midiInput, tempoManager }) {
  const byId = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with id "${id}" not found`);
    }
    return element;
  };

  const startBtn = byId('start');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      // Disable button while attempting to start
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';

      try {
        await synth.start();
        startBtn.textContent = 'Audio Running';
        startBtn.style.opacity = '0.6';
        startBtn.style.cursor = 'not-allowed';
        // Keep disabled on success
      } catch (error) {
        console.error('Failed to start audio:', error);
        // Re-enable button on error so user can retry
        startBtn.disabled = false;
        startBtn.textContent = 'Start Audio (Click to Retry)';
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';

        // Show error to user
        alert(
          `Failed to start audio: ${error.message || 'Unknown error'}\n\nPlease try clicking the button again.`
        );
      }
    });

    // Monitor AudioContext state and re-enable button if suspended
    if (synth.ctx) {
      const checkContextState = () => {
        if (synth.ctx.state === 'suspended' && startBtn.disabled) {
          startBtn.disabled = false;
          startBtn.textContent = 'Resume Audio';
          startBtn.style.opacity = '1';
          startBtn.style.cursor = 'pointer';
        }
      };

      // Check periodically (every second) - store interval ID for cleanup
      const contextCheckInterval = setInterval(checkContextState, 1000);

      // Store cleanup function globally for potential cleanup on page unload
      window.__audioContextCheckInterval = contextCheckInterval;
    }
  }

  // Setup MIDI UI if available
  if (midiInput) {
    initMIDIUI(midiInput);
  }

  // Setup synth parameter controls
  initParameterControls(synth, tempoManager);

  // Setup keyboard
  initKeyboard(synth);

  // Setup voice count display
  const voiceCountValue = byId('voiceCountValue');
  if (voiceCountValue) {
    window.addEventListener('voiceCount', (event) => {
      const { active } = event.detail;
      voiceCountValue.textContent = active;

      // Optional: Add visual feedback for voice pressure
      const voiceCountElement = byId('voiceCount');
      if (voiceCountElement) {
        // Remove all color classes first
        voiceCountElement.classList.remove('green', 'orange', 'red');

        // Add appropriate color class based on active voices
        if (active >= 7) {
          voiceCountElement.classList.add('red'); // Red when nearly full
        } else if (active >= 5) {
          voiceCountElement.classList.add('orange'); // Orange when getting full
        } else if (active > 0) {
          voiceCountElement.classList.add('green'); // Green when active
        }
        // No class = default styling when idle
      }
    });
  }
}
