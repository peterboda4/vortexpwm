import { initUI } from './ui/controls.js';
import { Synth, checkBrowserCompatibility } from './audio/synth.js';
import { MIDIInput } from './midi/midi-input.js';
import { FXControls } from './ui/fx-controls.js';
import { destroyKeyboard } from './ui/keyboard.js';

// Helper to show user-visible error messages
function showError(title, message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff4444;
    color: white;
    padding: 20px 30px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 500px;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  errorDiv.innerHTML = `
    <h2 style="margin: 0 0 10px 0; font-size: 18px;">${title}</h2>
    <p style="margin: 0; font-size: 14px; line-height: 1.5;">${message}</p>
  `;
  document.body.appendChild(errorDiv);
}

// Initialize application with error handling
async function initApp() {
  // Check browser compatibility first
  const compat = checkBrowserCompatibility();
  if (!compat.supported) {
    showError('Browser Not Supported', compat.message);
    return;
  }

  try {
    // Initialize synthesizer
    const synth = new Synth();
    const state = await synth.init(); // loads worklet & creates node

    // Initialize FX chain
    let fxController;
    try {
      fxController = await synth.initFX();
      console.log('FX Chain initialized');
    } catch (error) {
      console.error('FX initialization failed:', error);
      // Reconnect synth directly to destination as fallback
      synth.node.connect(synth.ctx.destination);
      showError(
        'Effects Chain Error',
        'Failed to initialize audio effects. The synthesizer will work but effects will be unavailable. Please refresh the page to try again.'
      );
      // Continue without FX - synth still works
    }

    // Initialize MIDI input
    const midiInput = new MIDIInput(synth);
    const midiEnabled = await midiInput.init();

    if (midiEnabled) {
      console.log('MIDI inputs available:', midiInput.getAvailableInputs());
    } else {
      console.log('MIDI not available - using keyboard/mouse only');
    }

    // Wire UI
    initUI({ synth, state, midiInput: midiEnabled ? midiInput : null });

    // Initialize FX UI if FX controller is available
    if (fxController) {
      const fxControls = new FXControls(fxController);
      console.log('FX UI initialized');
    }

    // Setup visibility change handler to resume audio when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && synth.ctx && synth.ctx.state === 'suspended') {
        console.log('Tab became visible, resuming audio...');
        synth.ctx.resume().catch((err) => {
          console.error(
            'Failed to resume audio after tab visibility change:',
            err
          );
        });
      }
    });

    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      destroyKeyboard();
      // Clear the context check interval if it exists
      if (window.__audioContextCheckInterval) {
        clearInterval(window.__audioContextCheckInterval);
        delete window.__audioContextCheckInterval;
      }
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);

    // Provide helpful error messages based on the error type
    let message =
      'The synthesizer failed to initialize. This could be because your browser does not support the Web Audio API or AudioWorklet.';

    if (
      error.message.includes('AudioWorklet') ||
      error.message.includes('audioWorklet')
    ) {
      message +=
        ' Make sure you are using a modern browser (Chrome 66+, Firefox 76+, Safari 14.1+, Edge 79+).';
    }

    if (window.location.protocol === 'file:') {
      message +=
        ' Also note that this app must be served over HTTPS or from localhost, not from the file:// protocol.';
    }

    showError('Initialization Failed', message);
  }
}

// Start the application
initApp();
