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

  // === AFTERTOUCH MODULATION ===
  {
    name: 'aftertouchDest1',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const destinations = [
        'None',
        'O1Pitch',
        'O1Vol',
        'Sub1Vol',
        'O1PW',
        'PWMRate',
        'FMDepth',
        'O2Pitch',
        'O2Vol',
        'Sub2Vol',
        'RingVol',
        'NoiseMix',
        'LPCut',
        'LPRes',
        'HPCut',
        'HPRes',
        'PanDepth',
        'PanRate',
      ];
      return destinations[Math.round(v)] || 'None';
    },
  },
  {
    name: 'aftertouchAmount1',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'aftertouchDest2',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const destinations = [
        'None',
        'O1Pitch',
        'O1Vol',
        'Sub1Vol',
        'O1PW',
        'PWMRate',
        'FMDepth',
        'O2Pitch',
        'O2Vol',
        'Sub2Vol',
        'RingVol',
        'NoiseMix',
        'LPCut',
        'LPRes',
        'HPCut',
        'HPRes',
        'PanDepth',
        'PanRate',
      ];
      return destinations[Math.round(v)] || 'None';
    },
  },
  {
    name: 'aftertouchAmount2',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'aftertouchDest3',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const destinations = [
        'None',
        'O1Pitch',
        'O1Vol',
        'Sub1Vol',
        'O1PW',
        'PWMRate',
        'FMDepth',
        'O2Pitch',
        'O2Vol',
        'Sub2Vol',
        'RingVol',
        'NoiseMix',
        'LPCut',
        'LPRes',
        'HPCut',
        'HPRes',
        'PanDepth',
        'PanRate',
      ];
      return destinations[Math.round(v)] || 'None';
    },
  },
  {
    name: 'aftertouchAmount3',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => v.toFixed(2),
  },
  {
    name: 'aftertouchDest4',
    defaultValue: 0,
    minValue: 0,
    maxValue: 17,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => {
      const destinations = [
        'None',
        'O1Pitch',
        'O1Vol',
        'Sub1Vol',
        'O1PW',
        'PWMRate',
        'FMDepth',
        'O2Pitch',
        'O2Vol',
        'Sub2Vol',
        'RingVol',
        'NoiseMix',
        'LPCut',
        'LPRes',
        'HPCut',
        'HPRes',
        'PanDepth',
        'PanRate',
      ];
      return destinations[Math.round(v)] || 'None';
    },
  },
  {
    name: 'aftertouchAmount4',
    defaultValue: 0.0,
    minValue: -1.0,
    maxValue: 1.0,
    automationRate: 'k-rate',
    unit: '',
    displayFormat: (v) => v.toFixed(2),
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
