import { FXBase } from '../fx-base.js';

/**
 * True stereo flanger effect
 * Short modulated delay with feedback for classic jet-plane sweep
 */
export class FlangerEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // Max 20ms delay buffer (typical flanger range)
    this.maxDelaySamples = Math.floor(sampleRate * 0.02);
    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.writeIndex = 0;

    // LFO state
    this.lfoPhase = 0;

    // Default parameters
    this.rate = 0.5; // LFO rate in Hz (0.1-5)
    this.depth = 3.0; // LFO depth in milliseconds (0.1-10)
    this.feedback = 0.7; // Feedback amount (-1 to +1)
    this.mix = 0.5; // Dry/wet mix (0-1)
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Update LFO (sine wave)
    const lfoValue = Math.sin(this.lfoPhase * 2 * Math.PI);
    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    // Calculate modulated delay time in samples
    // Depth is directly in milliseconds (0.1-10ms)
    const depthSamples = (this.depth / 1000) * this.sampleRate;
    const delaySamples = depthSamples * (lfoValue * 0.5 + 0.5); // Map LFO -1..1 to 0..1

    // Clamp to valid range (at least 1 sample, max buffer size - 2)
    const clampedDelay = Math.max(
      1,
      Math.min(this.maxDelaySamples - 2, delaySamples)
    );

    // Calculate read position with proper interpolation
    const readPos = this.writeIndex - clampedDelay;
    const readIndex =
      (Math.floor(readPos) + this.maxDelaySamples) % this.maxDelaySamples;
    const readIndexNext = (readIndex + 1) % this.maxDelaySamples;
    const frac = readPos - Math.floor(readPos);

    // Linear interpolation for smoother delay modulation
    const delayedL =
      this.bufferL[readIndex] * (1 - frac) + this.bufferL[readIndexNext] * frac;
    const delayedR =
      this.bufferR[readIndex] * (1 - frac) + this.bufferR[readIndexNext] * frac;

    // Write to buffer with feedback
    this.bufferL[this.writeIndex] = inputL + delayedL * this.feedback;
    this.bufferR[this.writeIndex] = inputR + delayedR * this.feedback;

    // Advance write index
    this.writeIndex = (this.writeIndex + 1) % this.maxDelaySamples;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + delayedL * this.mix;
    const outputR = inputR * (1 - this.mix) + delayedR * this.mix;

    return [outputL, outputR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'rate':
        this.rate = Math.max(0.1, Math.min(5, value));
        break;
      case 'depth':
        this.depth = Math.max(0.1, Math.min(10, value));
        break;
      case 'feedback':
        this.feedback = Math.max(-1, Math.min(1, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.bufferL.fill(0);
    this.bufferR.fill(0);
    this.writeIndex = 0;
    this.lfoPhase = 0;
  }

  static getMetadata() {
    return {
      id: 'flanger',
      name: 'Flanger',
      parameters: [
        {
          name: 'rate',
          label: 'Rate',
          min: 0.1,
          max: 5,
          default: 0.5,
          unit: 'Hz',
        },
        {
          name: 'depth',
          label: 'Depth',
          min: 0.1,
          max: 10,
          default: 3.0,
          unit: 'ms',
        },
        {
          name: 'feedback',
          label: 'Feedback',
          min: -1,
          max: 1,
          default: 0.7,
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.5 },
      ],
    };
  }
}
