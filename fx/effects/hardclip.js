import { FXBase } from '../fx-base.js';

/**
 * True stereo hard clipping distortion
 * Simple but effective waveshaping with pre/post gain
 */
export class HardClipEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // Default parameters
    this.drive = 1.0; // Pre-gain (1-20)
    this.threshold = 0.5; // Clipping threshold (0.1-1)
    this.mix = 0.5; // Dry/wet mix (0-1)

    // Compensation constants (tunable)
    this.DRIVE_COMP_STRENGTH = 0.75;
    this.THRESHOLD_COMP_STRENGTH = 0.3;
    this.BASE_GAIN = 1.0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Apply drive
    let wetL = inputL * this.drive;
    let wetR = inputR * this.drive;

    // Hard clip
    wetL = Math.max(-this.threshold, Math.min(this.threshold, wetL));
    wetR = Math.max(-this.threshold, Math.min(this.threshold, wetR));

    // Normalize to [-1, 1]
    wetL /= this.threshold;
    wetR /= this.threshold;

    // Apply compensation
    // Higher drive needs ATTENUATION (divide), not amplification
    const driveComp = 1.0 / Math.pow(this.drive, this.DRIVE_COMP_STRENGTH);
    // Lower threshold needs ATTENUATION (multiply by threshold)
    const thresholdComp = Math.pow(
      this.threshold,
      this.THRESHOLD_COMP_STRENGTH
    );
    const totalGain = driveComp * thresholdComp * this.BASE_GAIN;

    wetL *= totalGain;
    wetR *= totalGain;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + wetL * this.mix;
    const outputR = inputR * (1 - this.mix) + wetR * this.mix;

    return [outputL, outputR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'drive':
        this.drive = Math.max(1, Math.min(20, value));
        break;
      case 'threshold':
        this.threshold = Math.max(0.1, Math.min(1, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  static getMetadata() {
    return {
      id: 'hardclip',
      name: 'Hard Clip',
      parameters: [
        {
          name: 'drive',
          label: 'Drive',
          min: 1,
          max: 20,
          default: 1,
          unit: 'x',
        },
        {
          name: 'threshold',
          label: 'Threshold',
          min: 0.1,
          max: 1,
          default: 0.5,
          unit: '',
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.5, unit: '' },
      ],
    };
  }
}
