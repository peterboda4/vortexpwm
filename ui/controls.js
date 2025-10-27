// ui/controls.js - main UI orchestrator

import { initMIDIUI } from './midi-controls.js';
import { initParameterControls } from './parameter-controls.js';
import { initKeyboard } from './keyboard.js';

export function initUI({ synth, midiInput }) {
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

      // Check periodically (every second)
      setInterval(checkContextState, 1000);
    }
  }

  // Setup MIDI UI if available
  if (midiInput) {
    initMIDIUI(midiInput);
  }

  // Setup synth parameter controls
  initParameterControls(synth);

  // Setup keyboard
  initKeyboard(synth);
}
