import { FXBase } from '../fx-base.js';

/**
 * True stereo phaser effect
 * Uses all-pass filters modulated by LFO for phase shifting
 */
export class PhaserEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.numStages = 4; // Number of all-pass filter stages

    // All-pass filter state (per channel, per stage)
    this.allpassL = Array(this.numStages)
      .fill(0)
      .map(() => ({ a1: 0, zm1: 0 }));
    this.allpassR = Array(this.numStages)
      .fill(0)
      .map(() => ({ a1: 0, zm1: 0 }));

    // LFO state
    this.lfoPhase = 0;

    // Default parameters
    this.rate = 0.5; // LFO rate in Hz (0.1-10)
    this.depth = 0.7; // LFO depth (0-1)
    this.feedback = 0.5; // Feedback amount (0-0.95)
    this.mix = 0.2; // Dry/wet mix (0-1)
    this.minFreq = 200; // Minimum sweep frequency
    this.maxFreq = 2000; // Maximum sweep frequency

    this.feedbackL = 0;
    this.feedbackR = 0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Update LFO
    const lfoValue = Math.sin(this.lfoPhase * 2 * Math.PI);
    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    // Calculate all-pass filter frequency
    const freqRange = this.maxFreq - this.minFreq;
    const currentFreq =
      this.minFreq + (lfoValue * 0.5 + 0.5) * freqRange * this.depth;

    // All-pass coefficient calculation with stability bounds
    const omega = Math.min(
      (2 * Math.PI * currentFreq) / this.sampleRate,
      Math.PI * 0.95
    );
    const tanHalfOmega = Math.tan(omega / 2);
    const a1 = Math.max(
      -0.99,
      Math.min(0.99, (tanHalfOmega - 1) / (tanHalfOmega + 1))
    );

    // Process through all-pass stages (left channel)
    let outputL = inputL + this.feedbackL * this.feedback;
    for (let i = 0; i < this.numStages; i++) {
      const stage = this.allpassL[i];
      const input = outputL;
      outputL = a1 * input + stage.zm1;
      stage.zm1 = input - a1 * outputL;
    }
    this.feedbackL = Math.max(-2, Math.min(2, outputL));

    // Process through all-pass stages (right channel)
    let outputR = inputR + this.feedbackR * this.feedback;
    for (let i = 0; i < this.numStages; i++) {
      const stage = this.allpassR[i];
      const input = outputR;
      outputR = a1 * input + stage.zm1;
      stage.zm1 = input - a1 * outputR;
    }
    this.feedbackR = Math.max(-2, Math.min(2, outputR));

    // Mix dry/wet
    const finalL = inputL * (1 - this.mix) + outputL * this.mix;
    const finalR = inputR * (1 - this.mix) + outputR * this.mix;

    return [finalL, finalR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'rate':
        this.rate = Math.max(0.1, Math.min(10, value));
        break;
      case 'depth':
        this.depth = Math.max(0, Math.min(1, value));
        break;
      case 'feedback':
        this.feedback = Math.max(0, Math.min(0.95, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.allpassL.forEach((stage) => {
      stage.zm1 = 0;
    });
    this.allpassR.forEach((stage) => {
      stage.zm1 = 0;
    });
    this.feedbackL = 0;
    this.feedbackR = 0;
    this.lfoPhase = 0;
  }

  static getMetadata() {
    return {
      id: 'phaser',
      name: 'Phaser',
      parameters: [
        {
          name: 'rate',
          label: 'Rate',
          min: 0.1,
          max: 10,
          default: 0.5,
          unit: 'Hz',
        },
        { name: 'depth', label: 'Depth', min: 0, max: 1, default: 0.7 },
        {
          name: 'feedback',
          label: 'Feedback',
          min: 0,
          max: 0.95,
          default: 0.5,
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.2 },
      ],
    };
  }
}
