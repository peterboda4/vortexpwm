import { FXBase } from '../fx-base.js';

/**
 * True stereo auto-wah effect
 * LFO-modulated resonant lowpass filter for classic wah sweep
 */
export class AutoWahEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // LFO state
    this.lfoPhase = 0;

    // Filter state (two-pole resonant lowpass per channel)
    this.filterStateL = { y1: 0, y2: 0, x1: 0, x2: 0 };
    this.filterStateR = { y1: 0, y2: 0, x1: 0, x2: 0 };

    // Default parameters
    this.rate = 0.5; // LFO rate in Hz (0.1-10)
    this.centerFreq = 800; // Center frequency (200-5000 Hz)
    this.range = 2.5; // Range in octaves (0.5-4)
    this.depth = 0.8; // Modulation depth/width (0-1)
    this.resonance = 3.0; // Filter Q factor (0.5-10)
    this.waveform = 0; // 0=sine, 1=triangle
    this.mix = 1.0; // Dry/wet mix (0-1)
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Generate LFO value (0 to 1 range)
    const lfo = this.getLFOValue(this.lfoPhase);

    // Update LFO phase
    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    // Map LFO to filter frequency with depth control
    // LFO sweeps symmetrically around center frequency
    // depth controls how much of the range is used
    const rangeSemitones = this.range * 12; // Convert octaves to semitones
    const modulationSemitones = (lfo - 0.5) * 2 * rangeSemitones * this.depth;
    const freq = this.centerFreq * Math.pow(2, modulationSemitones / 12);

    // Apply resonant lowpass filter (same frequency for both channels)
    const outputL = this.applyResonantLowpass(inputL, freq, this.filterStateL);
    const outputR = this.applyResonantLowpass(inputR, freq, this.filterStateR);

    // Mix dry/wet
    const finalL = inputL * (1 - this.mix) + outputL * this.mix;
    const finalR = inputR * (1 - this.mix) + outputR * this.mix;

    return [finalL, finalR];
  }

  getLFOValue(phase) {
    const waveformType = Math.round(this.waveform);

    switch (waveformType) {
      case 0: // Sine wave
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;

      case 1: // Triangle wave
        return phase < 0.5 ? phase * 2 : 2 - phase * 2;

      default:
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;
    }
  }

  applyResonantLowpass(input, cutoffFreq, state) {
    // Two-pole resonant lowpass filter using RBJ cookbook formula
    // Clamp frequency to valid range
    const freq = Math.max(20, Math.min(this.sampleRate * 0.45, cutoffFreq));
    const omega = (2 * Math.PI * freq) / this.sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);

    // Use Q factor directly (resonance parameter is Q)
    const Q = Math.max(0.5, Math.min(10, this.resonance));
    const alpha = sinOmega / (2 * Q);

    const b0 = (1 - cosOmega) / 2;
    const b1 = 1 - cosOmega;
    const b2 = (1 - cosOmega) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosOmega;
    const a2 = 1 - alpha;

    // Normalize coefficients
    const b0n = b0 / a0;
    const b1n = b1 / a0;
    const b2n = b2 / a0;
    const a1n = a1 / a0;
    const a2n = a2 / a0;

    // Direct Form II implementation
    const output =
      b0n * input +
      b1n * state.x1 +
      b2n * state.x2 -
      a1n * state.y1 -
      a2n * state.y2;

    // Update state
    state.x2 = state.x1;
    state.x1 = input;
    state.y2 = state.y1;
    state.y1 = output;

    return output;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'rate':
        this.rate = Math.max(0.1, Math.min(10, value));
        break;
      case 'centerFreq':
        this.centerFreq = Math.max(200, Math.min(5000, value));
        break;
      case 'range':
        this.range = Math.max(0.5, Math.min(4, value));
        break;
      case 'depth':
        this.depth = Math.max(0, Math.min(1, value));
        break;
      case 'resonance':
        this.resonance = Math.max(0.5, Math.min(10, value));
        break;
      case 'waveform':
        this.waveform = Math.max(0, Math.min(1, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.lfoPhase = 0;
    this.filterStateL = { y1: 0, y2: 0, x1: 0, x2: 0 };
    this.filterStateR = { y1: 0, y2: 0, x1: 0, x2: 0 };
  }

  static getMetadata() {
    return {
      id: 'autowah',
      name: 'Auto-Wah',
      parameters: [
        {
          name: 'rate',
          label: 'Rate',
          min: 0.1,
          max: 10,
          default: 0.5,
          unit: 'Hz',
        },
        {
          name: 'centerFreq',
          label: 'Center',
          min: 200,
          max: 5000,
          default: 800,
          unit: 'Hz',
        },
        {
          name: 'range',
          label: 'Range',
          min: 0.5,
          max: 4,
          default: 2.5,
          unit: 'oct',
        },
        {
          name: 'depth',
          label: 'Depth',
          min: 0,
          max: 1,
          default: 0.8,
        },
        {
          name: 'resonance',
          label: 'Q',
          min: 0.5,
          max: 10,
          default: 3.0,
        },
        {
          name: 'waveform',
          label: 'Wave',
          min: 0,
          max: 1,
          default: 0,
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 1.0 },
      ],
    };
  }
}
