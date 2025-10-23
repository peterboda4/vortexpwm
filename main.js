import { initUI } from './ui/controls.js';
import { Synth } from './audio/synth.js';
import { MIDIInput } from './midi/midi-input.js';
import { FXControls } from './ui/fx-controls.js';

const synth = new Synth();
const state = await synth.init(); // loads worklet & creates node

// Initialize FX chain
const fxController = await synth.initFX();
console.log('FX Chain initialized');

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

// Initialize FX UI
const fxControls = new FXControls(fxController);
console.log('FX UI initialized');
