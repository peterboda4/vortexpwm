import { FXBase } from '../fx-base.js';

/**
 * True stereo bit crusher
 * Reduces bit depth and sample rate for lo-fi digital distortion
 */
export class BitCrusherEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // Default parameters
    this.bitDepth = 16; // Bit depth (1-16)
    this.sampleRateReduction = 1; // Sample rate divisor (1-50)
    this.mix = 1.0; // Dry/wet mix (0-1)

    // Sample hold state
    this.holdCounterL = 0;
    this.holdCounterR = 0;
    this.heldSampleL = 0;
    this.heldSampleR = 0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Sample rate reduction (sample and hold)
    let crushedL, crushedR;

    if (this.holdCounterL <= 0) {
      this.heldSampleL = inputL;
      this.holdCounterL = this.sampleRateReduction;
    }
    crushedL = this.heldSampleL;
    this.holdCounterL--;

    if (this.holdCounterR <= 0) {
      this.heldSampleR = inputR;
      this.holdCounterR = this.sampleRateReduction;
    }
    crushedR = this.heldSampleR;
    this.holdCounterR--;

    // Bit depth reduction
    const levels = Math.pow(2, this.bitDepth);
    const step = 1 / levels;

    // Quantize to levels, then apply makeup gain for low bit depths
    crushedL = Math.floor((crushedL + 1) * levels) / levels - 1;
    crushedR = Math.floor((crushedR + 1) * levels) / levels - 1;

    // Apply makeup gain for very low bit depths to maintain volume
    const makeupGain = Math.max(1, 1 / Math.max(this.bitDepth / 16, 0.25));
    crushedL *= makeupGain;
    crushedR *= makeupGain;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + crushedL * this.mix;
    const outputR = inputR * (1 - this.mix) + crushedR * this.mix;

    return [outputL, outputR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'bitDepth':
        // Non-linear mapping: compress 2-4 bits into larger slider range
        // Use exponential curve for better control at low bit depths
        const normalized = (value - 2) / 14; // 0-1 range
        const curved = Math.pow(normalized, 0.5); // Square root for compression
        const mapped = 2 + curved * 14; // Back to 2-16 range
        this.bitDepth = Math.max(2, Math.min(16, Math.round(mapped)));
        break;
      case 'sampleRateReduction':
        this.sampleRateReduction = Math.max(1, Math.min(50, Math.round(value)));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.holdCounterL = 0;
    this.holdCounterR = 0;
    this.heldSampleL = 0;
    this.heldSampleR = 0;
  }

  static getMetadata() {
    return {
      id: 'bitcrusher',
      name: 'Bit Crusher',
      parameters: [
        {
          name: 'bitDepth',
          label: 'Bit Depth',
          min: 2,
          max: 16,
          default: 16,
          unit: 'bit',
        },
        {
          name: 'sampleRateReduction',
          label: 'Downsample',
          min: 1,
          max: 50,
          default: 1,
          unit: 'x',
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 1, unit: '' },
      ],
    };
  }
}
