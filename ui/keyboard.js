// ui/keyboard.js - visual keyboard and computer keyboard mapping

import { midiFromName, NAT } from '../utils/music.js';

export function initKeyboard(synth) {
  const byId = (id) => document.getElementById(id);

  // Velocity slider (for keyboard & button input)
  let currentVelocity = 0.9;
  const velocitySlider = byId('velocity');
  const velocityVal = byId('velocityVal');
  const updateVelocity = (v) => {
    currentVelocity = +v;
    velocityVal.textContent = (+v).toFixed(2);
  };
  updateVelocity(velocitySlider.value);
  velocitySlider.addEventListener('input', (e) =>
    updateVelocity(e.target.value)
  );

  // Build 2-octave keyboard with natural notes C2..B3 (14 buttons)
  const kbd = document.getElementById('kbd');
  const notes = [];
  for (let oct = 2; oct <= 3; oct++) {
    for (const n of NAT) {
      notes.push(`${n}${oct}`);
    }
  }

  const btnByMidi = new Map();
  for (const name of notes) {
    const midi = midiFromName(name);
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.dataset.midi = String(midi);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.add('note-on');
      synth.noteOn(midi, currentVelocity);
    });
    const up = () => {
      btn.classList.remove('note-on');
      synth.noteOff(midi);
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    kbd.appendChild(btn);
    btnByMidi.set(midi, btn);
  }

  // Computer keyboard mapping: lower octave on bottom row, upper on top row (naturals only)
  const lowerKeys = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const upperKeys = [
    'q',
    'w',
    'e',
    'r',
    't',
    'y',
    'u',
    'i',
    'o',
    'p',
    '[',
    ']',
  ]; // we use first 7
  const midiLower = notes.slice(0, 7).map(midiFromName); // C2..B2
  const midiUpper = notes.slice(7, 14).map(midiFromName); // C3..B3

  const keyToMidi = new Map();
  lowerKeys
    .slice(0, midiLower.length)
    .forEach((k, i) => keyToMidi.set(k, midiLower[i]));
  upperKeys
    .slice(0, midiUpper.length)
    .forEach((k, i) => keyToMidi.set(k, midiUpper[i]));

  const downSet = new Set();

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!keyToMidi.has(k)) return;
    if (downSet.has(k)) return;
    e.preventDefault();
    downSet.add(k);
    const midi = keyToMidi.get(k);
    btnByMidi.get(midi)?.classList.add('note-on');
    synth.noteOn(midi, currentVelocity);
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (!keyToMidi.has(k)) return;
    e.preventDefault();
    downSet.delete(k);
    const midi = keyToMidi.get(k);
    btnByMidi.get(midi)?.classList.remove('note-on');
    synth.noteOff(midi);
  });
}
