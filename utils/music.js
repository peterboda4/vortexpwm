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

// === TEMPO / BPM UTILITIES ===

/**
 * Tempo divisions for syncing LFO/effects to BPM
 * Maps division names to their multiplier relative to quarter note
 */
export const TEMPO_DIVISIONS = {
  '1/1': 0.25, // Whole note (4 beats)
  '1/2': 0.5, // Half note (2 beats)
  '1/2D': 0.75, // Dotted half note (3 beats)
  '1/2T': 0.333333, // Triplet half note (1.333 beats)
  '1/4': 1.0, // Quarter note (1 beat) - reference
  '1/4D': 1.5, // Dotted quarter note (1.5 beats)
  '1/4T': 0.666667, // Triplet quarter note (0.666 beats)
  '1/8': 2.0, // Eighth note (0.5 beats)
  '1/8D': 3.0, // Dotted eighth note (0.75 beats)
  '1/8T': 1.333333, // Triplet eighth note (0.333 beats)
  '1/16': 4.0, // Sixteenth note (0.25 beats)
  '1/16D': 6.0, // Dotted sixteenth note (0.375 beats)
  '1/16T': 2.666667, // Triplet sixteenth note (0.166 beats)
  '1/32': 8.0, // Thirty-second note (0.125 beats)
};

/**
 * Convert BPM and tempo division to frequency in Hz
 * @param {number} bpm - Beats per minute (20-300)
 * @param {string} [division='1/4'] - Tempo division (e.g., '1/4', '1/8', '1/4D', '1/8T')
 * @returns {number} Frequency in Hz
 * @throws {Error} If division is not recognized
 * @example
 * // 120 BPM at quarter note = 2 Hz (2 beats per second)
 * bpmToHz(120, '1/4') // => 2.0
 *
 * // 120 BPM at eighth note = 4 Hz (4 eighths per second)
 * bpmToHz(120, '1/8') // => 4.0
 *
 * // 120 BPM at dotted quarter = 1.333 Hz
 * bpmToHz(120, '1/4D') // => 1.333
 */
export function bpmToHz(bpm, division = '1/4') {
  if (typeof bpm !== 'number' || bpm < 20 || bpm > 300) {
    throw new Error(`Invalid BPM: ${bpm} (must be 20-300)`);
  }

  const multiplier = TEMPO_DIVISIONS[division];
  if (multiplier === undefined) {
    throw new Error(
      `Invalid tempo division: ${division} (must be one of ${Object.keys(TEMPO_DIVISIONS).join(', ')})`
    );
  }

  // BPM = beats per minute
  // Hz = cycles per second
  // Hz = (BPM / 60) * multiplier
  // Example: 120 BPM @ 1/4 = (120/60) * 1.0 = 2 Hz
  return (bpm / 60) * multiplier;
}

/**
 * Get array of available tempo division names
 * @returns {string[]} Array of division names (e.g., ['1/1', '1/2', '1/4', ...])
 */
export function getTempoDivisions() {
  return Object.keys(TEMPO_DIVISIONS);
}

/**
 * Check if a tempo division is valid
 * @param {string} division - Tempo division to validate
 * @returns {boolean} True if division is valid
 */
export function isValidTempoDivision(division) {
  return TEMPO_DIVISIONS.hasOwnProperty(division);
}

export { NAT, NAT_SEMI };
