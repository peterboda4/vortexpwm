import { FXBase } from '../fx-base.js';

/**
 * True stereo delay effect
 * Independent delay lines for L/R with feedback and cross-feedback
 */
export class DelayEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // Max 2 second delay
    this.maxDelaySamples = Math.floor(sampleRate * 2);
    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.writeIndex = 0;

    // Default parameters
    this.delayTimeL = 0.25; // Left delay time in seconds (0.001-2)
    this.delayTimeR = 0.375; // Right delay time in seconds (0.001-2)
    this.feedback = 0.3; // Feedback amount (0-0.95)
    this.crossFeedback = 0.0; // Cross-channel feedback (0-0.5)
    this.mix = 0.3; // Dry/wet mix (0-1)
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Calculate delay samples
    const delaySamplesL = Math.floor(this.delayTimeL * this.sampleRate);
    const delaySamplesR = Math.floor(this.delayTimeR * this.sampleRate);

    // Calculate read indices (both use same writeIndex)
    const readIndexL =
      (this.writeIndex - delaySamplesL + this.maxDelaySamples) %
      this.maxDelaySamples;
    const readIndexR =
      (this.writeIndex - delaySamplesR + this.maxDelaySamples) %
      this.maxDelaySamples;

    // Read delayed samples
    const delayedL = this.bufferL[readIndexL];
    const delayedR = this.bufferR[readIndexR];

    // Write to buffers with feedback and cross-feedback
    this.bufferL[this.writeIndex] =
      inputL + delayedL * this.feedback + delayedR * this.crossFeedback;
    this.bufferR[this.writeIndex] =
      inputR + delayedR * this.feedback + delayedL * this.crossFeedback;

    // Advance write index (single index for both channels)
    this.writeIndex = (this.writeIndex + 1) % this.maxDelaySamples;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + delayedL * this.mix;
    const outputR = inputR * (1 - this.mix) + delayedR * this.mix;

    return [outputL, outputR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'delayTimeL':
        this.delayTimeL = Math.max(0.001, Math.min(2, value));
        break;
      case 'delayTimeR':
        this.delayTimeR = Math.max(0.001, Math.min(2, value));
        break;
      case 'feedback':
        this.feedback = Math.max(0, Math.min(0.95, value));
        break;
      case 'crossFeedback':
        this.crossFeedback = Math.max(0, Math.min(0.5, value));
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
  }

  static getMetadata() {
    return {
      id: 'delay',
      name: 'Stereo Delay',
      parameters: [
        {
          name: 'delayTimeL',
          label: 'Time L',
          min: 0.001,
          max: 2,
          default: 0.25,
          unit: 's',
        },
        {
          name: 'delayTimeR',
          label: 'Time R',
          min: 0.001,
          max: 2,
          default: 0.375,
          unit: 's',
        },
        {
          name: 'feedback',
          label: 'Feedback',
          min: 0,
          max: 0.95,
          default: 0.3,
        },
        {
          name: 'crossFeedback',
          label: 'X-Feed',
          min: 0,
          max: 0.5,
          default: 0,
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.3 },
      ],
    };
  }
}
