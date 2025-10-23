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
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Apply drive (pre-gain)
    let processedL = inputL * this.drive;
    let processedR = inputR * this.drive;

    // Hard clip
    processedL = Math.max(
      -this.threshold,
      Math.min(this.threshold, processedL)
    );
    processedR = Math.max(
      -this.threshold,
      Math.min(this.threshold, processedR)
    );

    // Normalize by threshold
    processedL /= this.threshold;
    processedR /= this.threshold;

    // Apply makeup gain that compensates for drive
    // At drive=1, gain=0.5; at drive=20, gain=0.1
    const makeupGain = 0.5 / Math.sqrt(this.drive);
    processedL *= makeupGain;
    processedR *= makeupGain;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + processedL * this.mix;
    const outputR = inputR * (1 - this.mix) + processedR * this.mix;

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
