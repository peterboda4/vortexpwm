// utils/parameter-registry.js - Centralized parameter definitions
// Single source of truth for all synth parameters
// Used by: audio/synth.js, worklet/synth-processor.js, ui/parameter-controls.js

/**
 * Parameter registry - defines all synth parameters with their metadata
 * Each parameter has:
 * - name: parameter identifier
 * - defaultValue: initial value
 * - minValue: minimum allowed value
 * - maxValue: maximum allowed value
 * - automationRate: 'a-rate' (per-sample) or 'k-rate' (per-block)
 * - unit: display unit (optional)
 * - displayFormat: function to format value for UI (optional)
 * - displayScale: 'linear' or 'exponential' for UI sliders (optional)
 */

/**
 * Modulation matrix source names
 */
export const MATRIX_SOURCES = [
  'None',
  'Note Number',
  'Velocity',
  'Pitch Bend',
  'Mod Wheel',
  'Aftertouch',
  'LFO1',
  'LFO2',
  'Amp Env',
  'Filter Env',
];

/**
 * Modulation matrix destination names
 */
export const MATRIX_DESTINATIONS = [
  'None',
  'OSC1 Pitch',
  'OSC1 PWM',
  'OSC1 PWM Depth',
  'OSC1 PWM Rate',
  'OSC1 Volume',
  'Sub1 Volume',
  'OSC1 FM',
  'OSC2 Pitch',
  'OSC2 Volume',
  'Sub2 Volume',
  'Ring Volume',
  'Noise Volume',
  'F1 Cutoff',
  'F1 Resonance',
  'F2 Cutoff',
  'F2 Resonance',
  'Filter Saturation',
  'LFO1 Rate',
  'LFO1 Amount',
  'LFO2 Rate',
  'LFO2 Amount',
  'Pan Position',
  'Pan Depth',
  'Pan Rate',
  'Master Volume',
];

/**
 * Get matrix source name by index
 * @param {number} index - Source index (0-9)
 * @returns {string} Source name
 */
export function getMatrixSourceName(index) {
  return MATRIX_SOURCES[Math.round(index)] || 'None';
}

/**
 * Get matrix destination name by index
 * @param {number} index - Destination index (0-25)
 * @returns {string} Destination name
 */
export function getMatrixDestinationName(index) {
  return MATRIX_DESTINATIONS[Math.round(index)] || 'None';
}

export const SYNTH_PARAMETERS = [
  // === OSCILLATOR 1 ===
  {
    name: 'oscillatorCoarseTune',
    defaultValue: 0,
    minValue: -48,
    maxValue: 48,
    automationRate: 'a-rate',
    unit: 'semitones',
    displayFormat: (v) => Math.round(v),
  },
  {
    name: 'oscillatorFineTune',
    defaultValue: 0,
    minValue: -50,
    maxValue: 50,
    automationRate: 'a-rate',
    unit: 'cents',
    displayFormat: (v) => Math.round(v),
  },
  {
    name: 'oscillatorVolume',
    defaultValue: 1.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'pulseWidth',
    defaultValue: 0.5,
    minValue: 0.01,
    maxValue: 0.99,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'pulseWidthModulationDepth',
    defaultValue: 0.5,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'pulseWidthModulationRate',
    defaultValue: 2.0,
    minValue: 0.1,
    maxValue: 10.0,
    automationRate: 'a-rate',
    unit: 'Hz',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'subOscillatorVolume',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'frequencyModulationDepth',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },

  // === OSCILLATOR 2 ===
  {
    name: 'oscillator2Waveform',
    defaultValue: 0,
    minValue: 0,
    maxValue: 3,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const waveforms = ['Saw', 'Triangle', 'Sine', 'Square'];
      return waveforms[Math.round(v)] || 'Saw';
    },
  },
  {
    name: 'oscillator2CoarseTune',
    defaultValue: 0,
    minValue: -48,
    maxValue: 48,
    automationRate: 'a-rate',
    unit: 'semitones',
    displayFormat: (v) => Math.round(v),
  },
  {
    name: 'oscillator2FineTune',
    defaultValue: 0,
    minValue: -50,
    maxValue: 50,
    automationRate: 'a-rate',
    unit: 'cents',
    displayFormat: (v) => Math.round(v),
  },
  {
    name: 'oscillator2Volume',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'subOscillator2Volume',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'oscillator2HardSync',
    defaultValue: 0,
    minValue: 0,
    maxValue: 1,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => (v > 0 ? 'On' : 'Off'),
  },

  // === MODULATION ===
  {
    name: 'ringModulatorVolume',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'noiseVolume',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },

  // === LFO1 ===
  {
    name: 'lfo1Rate',
    defaultValue: 2.0,
    minValue: 0.01,
    maxValue: 50.0,
    automationRate: 'a-rate',
    unit: 'Hz',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'lfo1Depth',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'lfo1Waveform',
    defaultValue: 0,
    minValue: 0,
    maxValue: 5,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const waveforms = [
        'Sine',
        'Triangle',
        'Square',
        'Saw Up',
        'Saw Down',
        'S&H',
      ];
      return waveforms[Math.round(v)] || 'Sine';
    },
  },
  {
    name: 'lfo1Phase',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 360.0,
    automationRate: 'k-rate',
    unit: '°',
    displayFormat: (v) => Math.round(v) + '°',
  },
  {
    name: 'lfo1TempoSync',
    defaultValue: 0,
    minValue: 0,
    maxValue: 1,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => (v > 0 ? 'On' : 'Off'),
  },
  {
    name: 'lfo1SyncDivision',
    defaultValue: 4,
    minValue: 0,
    maxValue: 12,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const divisions = [
        '1/1',
        '1/2',
        '1/2D',
        '1/2T',
        '1/4',
        '1/4D',
        '1/4T',
        '1/8',
        '1/8D',
        '1/8T',
        '1/16',
        '1/16D',
        '1/16T',
        '1/32',
      ];
      return divisions[Math.round(v)] || '1/4';
    },
  },
  {
    name: 'lfo1Retrigger',
    defaultValue: 1,
    minValue: 0,
    maxValue: 1,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => (v > 0 ? 'Key' : 'Free'),
  },
  {
    name: 'lfo1FadeIn',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 5.0,
    automationRate: 'k-rate',
    unit: 's',
    displayFormat: (v) =>
      v >= 1.0 ? v.toFixed(1) + 's' : Math.round(v * 1000) + 'ms',
  },

  // === LFO2 ===
  {
    name: 'lfo2Rate',
    defaultValue: 2.0,
    minValue: 0.01,
    maxValue: 50.0,
    automationRate: 'a-rate',
    unit: 'Hz',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'lfo2Depth',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'lfo2Waveform',
    defaultValue: 0,
    minValue: 0,
    maxValue: 5,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const waveforms = [
        'Sine',
        'Triangle',
        'Square',
        'Saw Up',
        'Saw Down',
        'S&H',
      ];
      return waveforms[Math.round(v)] || 'Sine';
    },
  },
  {
    name: 'lfo2Phase',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 360.0,
    automationRate: 'k-rate',
    unit: '°',
    displayFormat: (v) => Math.round(v) + '°',
  },
  {
    name: 'lfo2TempoSync',
    defaultValue: 0,
    minValue: 0,
    maxValue: 1,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => (v > 0 ? 'On' : 'Off'),
  },
  {
    name: 'lfo2SyncDivision',
    defaultValue: 4,
    minValue: 0,
    maxValue: 12,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const divisions = [
        '1/1',
        '1/2',
        '1/2D',
        '1/2T',
        '1/4',
        '1/4D',
        '1/4T',
        '1/8',
        '1/8D',
        '1/8T',
        '1/16',
        '1/16D',
        '1/16T',
        '1/32',
      ];
      return divisions[Math.round(v)] || '1/4';
    },
  },
  {
    name: 'lfo2Retrigger',
    defaultValue: 1,
    minValue: 0,
    maxValue: 1,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => (v > 0 ? 'Key' : 'Free'),
  },
  {
    name: 'lfo2FadeIn',
    defaultValue: 0.0,
    minValue: 0.0,
    maxValue: 5.0,
    automationRate: 'k-rate',
    unit: 's',
    displayFormat: (v) =>
      v >= 1.0 ? v.toFixed(1) + 's' : Math.round(v * 1000) + 'ms',
  },

  // === PANNING ===
  {
    name: 'panningPosition',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => `${(v * 100).toFixed(0)}%`,
  },
  {
    name: 'panningModulationDepth',
    defaultValue: 0.5,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'panningModulationRate',
    defaultValue: 0.5,
    minValue: 0.1,
    maxValue: 10.0,
    automationRate: 'a-rate',
    unit: 'Hz',
    displayFormat: (v) => v.toFixed(2),
  },

  // === AMPLITUDE ENVELOPE ===
  {
    name: 'envelopeAttack',
    defaultValue: 0.005,
    minValue: 0.001,
    maxValue: 6.0,
    automationRate: 'k-rate',
    unit: 'ms',
    displayFormat: (v) => Math.round(v * 1000),
  },
  {
    name: 'envelopeDecay',
    defaultValue: 0.1,
    minValue: 0.001,
    maxValue: 6.0,
    automationRate: 'k-rate',
    unit: 'ms',
    displayFormat: (v) => Math.round(v * 1000),
  },
  {
    name: 'envelopeSustain',
    defaultValue: 0.7,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'envelopeRelease',
    defaultValue: 0.2,
    minValue: 0.001,
    maxValue: 6.0,
    automationRate: 'k-rate',
    unit: 'ms',
    displayFormat: (v) => Math.round(v * 1000),
  },

  // === VELOCITY ===
  {
    name: 'velocityAmount',
    defaultValue: 0.5,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },

  // === PITCH ===
  {
    name: 'pitchBend',
    defaultValue: 0,
    minValue: -1,
    maxValue: 1,
    automationRate: 'a-rate',
    unit: '',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'pitchBendRange',
    defaultValue: 2,
    minValue: 0,
    maxValue: 24,
    automationRate: 'k-rate',
    unit: 'semitones',
    displayFormat: (v) => Math.round(v),
  },
  {
    name: 'modWheel',
    defaultValue: 0,
    minValue: 0,
    maxValue: 1,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => Math.round(v * 100) + '%',
  },

  // === FILTER (LOWPASS) ===
  {
    name: 'filterCutoff',
    defaultValue: 5000,
    minValue: 20,
    maxValue: 20000,
    automationRate: 'a-rate',
    unit: 'Hz',
    displayFormat: (v) => Math.round(v),
    displayScale: 'exponential',
  },
  {
    name: 'filterResonance',
    defaultValue: 0.1,
    minValue: 0.0,
    maxValue: 0.95,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },

  // === FILTER (HIGHPASS) ===
  {
    name: 'hpfCutoff',
    defaultValue: 20,
    minValue: 20,
    maxValue: 20000,
    automationRate: 'a-rate',
    unit: 'Hz',
    displayFormat: (v) => Math.round(v),
    displayScale: 'exponential',
  },
  {
    name: 'hpfResonance',
    defaultValue: 0.1,
    minValue: 0.0,
    maxValue: 0.95,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },

  // === FILTER ENVELOPE ===
  {
    name: 'filterEnvAttack',
    defaultValue: 0.005,
    minValue: 0.001,
    maxValue: 6.0,
    automationRate: 'k-rate',
    unit: 'ms',
    displayFormat: (v) => Math.round(v * 1000),
  },
  {
    name: 'filterEnvDecay',
    defaultValue: 0.1,
    minValue: 0.001,
    maxValue: 6.0,
    automationRate: 'k-rate',
    unit: 'ms',
    displayFormat: (v) => Math.round(v * 1000),
  },
  {
    name: 'filterEnvSustain',
    defaultValue: 0.7,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'filterEnvRelease',
    defaultValue: 0.2,
    minValue: 0.001,
    maxValue: 6.0,
    automationRate: 'k-rate',
    unit: 'ms',
    displayFormat: (v) => Math.round(v * 1000),
  },
  {
    name: 'lpEnvAmount',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '',
    displayFormat: (v) => Math.round(v * 100),
  },
  {
    name: 'hpEnvAmount',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '',
    displayFormat: (v) => Math.round(v * 100),
  },

  // === LEGACY AFTERTOUCH (DEPRECATED - kept for backward compatibility) ===
  // TODO: Remove after worklet migration to matrix system
  {
    name: 'aftertouchDest1',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => 'None',
  },
  {
    name: 'aftertouchAmount1',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => '0.00',
  },
  {
    name: 'aftertouchDest2',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => 'None',
  },
  {
    name: 'aftertouchAmount2',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => '0.00',
  },
  {
    name: 'aftertouchDest3',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => 'None',
  },
  {
    name: 'aftertouchAmount3',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => '0.00',
  },
  {
    name: 'aftertouchDest4',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => 'None',
  },
  {
    name: 'aftertouchAmount4',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => '0.00',
  },

  // === MODULATION MATRIX (12 slots) ===
  // Each slot has: source (0-9), destination (0-25), amount (-100 to +100)

  // Slot 1
  {
    name: 'matrixSource1',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest1',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount1',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 2
  {
    name: 'matrixSource2',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest2',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount2',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 3
  {
    name: 'matrixSource3',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest3',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount3',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 4
  {
    name: 'matrixSource4',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest4',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount4',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 5
  {
    name: 'matrixSource5',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest5',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount5',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 6
  {
    name: 'matrixSource6',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest6',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount6',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 7
  {
    name: 'matrixSource7',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest7',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount7',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 8
  {
    name: 'matrixSource8',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest8',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount8',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 9
  {
    name: 'matrixSource9',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest9',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount9',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 10
  {
    name: 'matrixSource10',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest10',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount10',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 11
  {
    name: 'matrixSource11',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest11',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount11',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // Slot 12
  {
    name: 'matrixSource12',
    defaultValue: 0,
    minValue: 0,
    maxValue: 9,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixSourceName(v),
  },
  {
    name: 'matrixDest12',
    defaultValue: 0,
    minValue: 0,
    maxValue: 25,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => getMatrixDestinationName(v),
  },
  {
    name: 'matrixAmount12',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    automationRate: 'k-rate',
    unit: '%',
    displayFormat: (v) => (v >= 0 ? '+' : '') + Math.round(v) + '%',
  },

  // === TEMPO ===
  {
    name: 'bpm',
    defaultValue: 120,
    minValue: 20,
    maxValue: 300,
    automationRate: 'k-rate',
    unit: 'BPM',
    displayFormat: (v) => Math.round(v),
  },

  // === MASTER ===
  {
    name: 'masterVolume',
    defaultValue: 0.4,
    minValue: 0.0,
    maxValue: 1.0,
    automationRate: 'a-rate',
    unit: '%',
    displayFormat: (v) => Math.round(v * 100),
  },
];

/**
 * Get parameter definition by name
 * @param {string} name - Parameter name
 * @returns {object|null} Parameter definition or null if not found
 */
export function getParameter(name) {
  return SYNTH_PARAMETERS.find((p) => p.name === name) || null;
}

/**
 * Get all parameter names
 * @returns {string[]} Array of parameter names
 */
export function getParameterNames() {
  return SYNTH_PARAMETERS.map((p) => p.name);
}

/**
 * Get parameterData object for AudioWorkletNode initialization
 * (Object with parameter names as keys and default values as values)
 * @returns {object} Parameter data object
 */
export function getParameterData() {
  const data = {};
  for (const param of SYNTH_PARAMETERS) {
    data[param.name] = param.defaultValue;
  }
  return data;
}

/**
 * Get parameterDescriptors array for AudioWorkletProcessor
 * (Array of objects with name, defaultValue, minValue, maxValue, automationRate)
 * @returns {array} Parameter descriptors array
 */
export function getParameterDescriptors() {
  return SYNTH_PARAMETERS.map((p) => ({
    name: p.name,
    defaultValue: p.defaultValue,
    minValue: p.minValue,
    maxValue: p.maxValue,
    automationRate: p.automationRate,
  }));
}

/**
 * Validate parameter value against its definition
 * @param {string} name - Parameter name
 * @param {number} value - Parameter value to validate
 * @returns {boolean} True if value is within valid range
 */
export function validateParameter(name, value) {
  const param = getParameter(name);
  if (!param) return false;
  return value >= param.minValue && value <= param.maxValue;
}
