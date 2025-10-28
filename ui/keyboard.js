// ui/keyboard.js - visual keyboard and computer keyboard mapping

import { midiToNoteName } from '../utils/music.js';

export function initKeyboard(synth) {
  const byId = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with id "${id}" not found`);
    }
    return element;
  };

  // Velocity slider (for keyboard & button input)
  let currentVelocity = 0.9;
  const velocitySlider = byId('velocity');
  const velocityVal = byId('velocityVal');
  if (velocitySlider && velocityVal) {
    const updateVelocity = (v) => {
      currentVelocity = +v;
      velocityVal.textContent = (+v).toFixed(2);
    };
    updateVelocity(velocitySlider.value);
    velocitySlider.addEventListener('input', (e) =>
      updateVelocity(e.target.value)
    );
    // Prevent slider from being focusable (keyboard is for synth notes only)
    velocitySlider.setAttribute('tabindex', '-1');
    velocitySlider.addEventListener('focus', (e) => {
      e.target.blur(); // Immediately blur if somehow focused
    });
  }

  // Build 5-octave keyboard with all semitones (C1..C6 = 61 keys)
  const kbd = byId('kbd');
  if (!kbd) return;

  // Create inner wrapper for centering
  const kbdInner = document.createElement('div');
  kbdInner.id = 'kbd-inner';
  kbd.appendChild(kbdInner);

  // Pattern of black keys: 1=black, 0=white only
  // C  C# D  D# E  F  F# G  G# A  A# B
  // 0  1  0  1  0  0  1  0  1  0  1  0
  const blackKeyPattern = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

  const btnByMidi = new Map();

  // Create all keys from C1 (MIDI 24) to C6 (MIDI 84)
  const startMidi = 24; // C1
  const endMidi = 84; // C6

  // First pass: create all white keys (they define the layout)
  let whiteKeyIndex = 0;
  const whiteKeyWidth = 32; // matches CSS
  for (let midi = startMidi; midi <= endMidi; midi++) {
    const isBlack = blackKeyPattern[midi % 12] === 1;
    if (isBlack) continue;

    const name = midiToNoteName(midi);
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.dataset.midi = String(midi);
    btn.classList.add('white-key');

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
    kbdInner.appendChild(btn);
    btnByMidi.set(midi, btn);
    whiteKeyIndex++;
  }

  // Second pass: create black keys positioned absolutely
  whiteKeyIndex = 0;
  for (let midi = startMidi; midi <= endMidi; midi++) {
    const isBlack = blackKeyPattern[midi % 12] === 1;
    if (!isBlack) {
      whiteKeyIndex++;
      continue;
    }

    const name = midiToNoteName(midi);
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.dataset.midi = String(midi);
    btn.classList.add('black-key');

    // Position black key centered between white keys
    // whiteKeyIndex points to the white key to the right of this black key
    // Center point is at the boundary between two white keys
    // Subtract half of black key width (11px) to center it
    const blackKeyWidth = 22; // matches CSS
    const centerPoint = whiteKeyIndex * whiteKeyWidth;
    const leftPos = centerPoint - blackKeyWidth / 2;
    btn.style.left = `${leftPos}px`;

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
    kbdInner.appendChild(btn);
    btnByMidi.set(midi, btn);
  }

  // Computer keyboard mapping with semitones
  // Bottom row: C3 octave (white and black keys)
  // z s x d c v g b h n j m , = C3 C#3 D3 D#3 E3 F3 F#3 G3 G#3 A3 A#3 B3 C4
  // Top row: C4 octave (white and black keys)
  // q 2 w 3 e r 5 t 6 y 7 u i = C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5
  const keyToMidi = new Map([
    // Bottom row - C3 octave (MIDI 48-60)
    ['z', 48], // C3
    ['s', 49], // C#3
    ['x', 50], // D3
    ['d', 51], // D#3
    ['c', 52], // E3
    ['v', 53], // F3
    ['g', 54], // F#3
    ['b', 55], // G3
    ['h', 56], // G#3
    ['n', 57], // A3
    ['j', 58], // A#3
    ['m', 59], // B3
    // Top row - C4 octave (MIDI 60-72)
    ['q', 60], // C4
    ['2', 61], // C#4
    ['w', 62], // D4
    ['3', 63], // D#4
    ['e', 64], // E4
    ['r', 65], // F4
    ['5', 66], // F#4
    ['t', 67], // G4
    ['6', 68], // G#4
    ['y', 69], // A4
    ['7', 70], // A#4
    ['u', 71], // B4
    ['i', 72], // C5
  ]);

  const downSet = new Set();

  // Helper to check if we should ignore keyboard events (e.g., when typing in text fields)
  const shouldIgnoreKeyboardEvent = (e) => {
    // Ignore if target is an editable element (but NOT range sliders)
    const target = e.target;
    const tagName = target.tagName.toLowerCase();
    if (
      (tagName === 'input' && target.type !== 'range') ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.contentEditable === 'true'
    ) {
      return true;
    }
    return false;
  };

  // Store handlers for cleanup
  const handleKeyDown = (e) => {
    // Ignore keyboard shortcuts when typing in text fields
    if (shouldIgnoreKeyboardEvent(e)) return;

    const k = e.key.toLowerCase();
    if (!keyToMidi.has(k)) return;
    if (downSet.has(k)) return;
    e.preventDefault();
    downSet.add(k);
    const midi = keyToMidi.get(k);
    btnByMidi.get(midi)?.classList.add('note-on');
    synth.noteOn(midi, currentVelocity);
  };

  const handleKeyUp = (e) => {
    // Ignore keyboard shortcuts when typing in text fields
    if (shouldIgnoreKeyboardEvent(e)) return;

    const k = e.key.toLowerCase();
    if (!keyToMidi.has(k)) return;
    e.preventDefault();
    downSet.delete(k);
    const midi = keyToMidi.get(k);
    btnByMidi.get(midi)?.classList.remove('note-on');
    synth.noteOff(midi);
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Store cleanup function globally for potential cleanup on page unload
  window.__keyboardCleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    // Clear active notes
    downSet.clear();
    btnByMidi.forEach((btn) => btn.classList.remove('note-on'));
  };
}

/**
 * Cleanup keyboard event listeners
 * Call this when destroying the synth or on page unload
 */
export function destroyKeyboard() {
  if (window.__keyboardCleanup) {
    window.__keyboardCleanup();
    delete window.__keyboardCleanup;
  }
}
