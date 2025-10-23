// ui/controls.js - main UI orchestrator

import { initMIDIUI } from './midi-controls.js';
import { initParameterControls } from './parameter-controls.js';
import { initKeyboard } from './keyboard.js';

export function initUI({ synth, midiInput }) {
  const byId = (id) => document.getElementById(id);

  const startBtn = byId('start');
  startBtn.addEventListener('click', async () => {
    await synth.start();
    startBtn.textContent = 'Audio working...';
    startBtn.disabled = true;
    startBtn.style.opacity = '0.6';
    startBtn.style.cursor = 'not-allowed';
  });

  // Setup MIDI UI if available
  if (midiInput) {
    initMIDIUI(midiInput);
  }

  // Setup synth parameter controls
  initParameterControls(synth);

  // Setup keyboard
  initKeyboard(synth);
}
