import { FXBase } from '../fx-base.js';

/**
 * True stereo tremolo effect
 * Amplitude modulation with adjustable waveform and stereo spread
 */
export class TremoloEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // LFO state
    this.lfoPhase = 0;

    // Default parameters
    this.rate = 4; // LFO rate in Hz (0.1-20)
    this.depth = 0.7; // Modulation depth (0-1)
    this.stereoPhase = 0; // Stereo phase offset (0-1, 0.5 = 180°)
    this.waveform = 0; // 0=sine, 1=triangle, 2=square
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Calculate LFO values for both channels (0 to 1 range)
    const lfoL = this.getLFOValue(this.lfoPhase);
    const lfoR = this.getLFOValue((this.lfoPhase + this.stereoPhase) % 1.0);

    // Update LFO phase
    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    // Convert LFO to gain modulation
    // When depth = 0: gain is always 1 (no effect)
    // When depth = 1: gain varies from 0 to 1 (full tremolo)
    const gainL = 1 - this.depth + lfoL * this.depth;
    const gainR = 1 - this.depth + lfoR * this.depth;

    // Apply amplitude modulation
    const outputL = inputL * gainL;
    const outputR = inputR * gainR;

    return [outputL, outputR];
  }

  getLFOValue(phase) {
    const waveformType = Math.round(this.waveform);

    switch (waveformType) {
      case 0: // Sine wave
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;

      case 1: // Triangle wave
        return phase < 0.5 ? phase * 2 : 2 - phase * 2;

      case 2: // Square wave
        return phase < 0.5 ? 1 : 0;

      default:
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;
    }
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'rate':
        this.rate = Math.max(0.1, Math.min(20, value));
        break;
      case 'depth':
        this.depth = Math.max(0, Math.min(1, value));
        break;
      case 'stereoPhase':
        this.stereoPhase = Math.max(0, Math.min(1, value));
        break;
      case 'waveform':
        this.waveform = Math.max(0, Math.min(2, value));
        break;
    }
  }

  reset() {
    this.lfoPhase = 0;
  }

  static getMetadata() {
    return {
      id: 'tremolo',
      name: 'Tremolo',
      parameters: [
        {
          name: 'rate',
          label: 'Rate',
          min: 0.1,
          max: 20,
          default: 4,
          unit: 'Hz',
        },
        { name: 'depth', label: 'Depth', min: 0, max: 1, default: 0.7 },
        {
          name: 'stereoPhase',
          label: 'Stereo',
          min: 0,
          max: 1,
          default: 0,
        },
        {
          name: 'waveform',
          label: 'Wave',
          min: 0,
          max: 2,
          default: 0,
          unit: '',
        },
      ],
    };
  }
}
