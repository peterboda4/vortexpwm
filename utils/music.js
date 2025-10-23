// utils/music.js - music theory utilities and MIDI conversions

const NAT = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export function midiFromName(name) {
  // name like "C2"
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
  if (!m) throw new Error('Bad note: ' + name);
  const [_, n, alt, octStr] = m;
  const oct = parseInt(octStr, 10);
  let semi = NAT_SEMI[n];
  if (alt === '#') semi += 1;
  if (alt === 'b') semi -= 1;
  return 12 * (oct + 1) + semi; // MIDI note numbers, C4=60
}

export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export { NAT, NAT_SEMI };
