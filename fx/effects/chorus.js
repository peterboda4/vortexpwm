import { FXBase } from '../fx-base.js';

/**
 * True stereo chorus effect
 * Multiple LFO-modulated delay lines per channel for rich detuning
 */
export class ChorusEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.numVoices = 2; // Number of chorus voices per channel
    this.maxDelayMs = 50; // Maximum delay in milliseconds
    this.maxDelaySamples = Math.floor(
      (this.maxDelayMs / 1000) * this.sampleRate
    );

    // Delay buffers (per channel)
    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.writeIndex = 0;

    // LFO state (per voice, per channel)
    this.lfoPhases = Array(this.numVoices * 2).fill(0);

    // Default parameters
    this.rate = 0.5; // LFO rate in Hz (0.1-5)
    this.depth = 0.7; // LFO depth (0-1)
    this.delay = 20; // Base delay in ms (5-50)
    this.mix = 0.2; // Dry/wet mix (0-1)
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Write input to delay buffers
    this.bufferL[this.writeIndex] = inputL;
    this.bufferR[this.writeIndex] = inputR;

    let chorusL = 0;
    let chorusR = 0;

    // Process each voice
    for (let voice = 0; voice < this.numVoices; voice++) {
      // Left channel LFO
      const lfoIndexL = voice * 2;
      const lfoL = Math.sin(this.lfoPhases[lfoIndexL] * 2 * Math.PI);
      this.lfoPhases[lfoIndexL] += this.rate / this.sampleRate;
      if (this.lfoPhases[lfoIndexL] >= 1) this.lfoPhases[lfoIndexL] -= 1;

      // Right channel LFO (phase offset for stereo width)
      const lfoIndexR = voice * 2 + 1;
      const lfoR = Math.sin(this.lfoPhases[lfoIndexR] * 2 * Math.PI);
      this.lfoPhases[lfoIndexR] += this.rate / this.sampleRate;
      if (this.lfoPhases[lfoIndexR] >= 1) this.lfoPhases[lfoIndexR] -= 1;

      // Calculate modulated delay time
      const modulationRange = this.delay * 0.3 * this.depth; // ±30% of base delay
      const delayMsL = this.delay + lfoL * modulationRange;
      const delayMsR = this.delay + lfoR * modulationRange;

      // Clamp delay to prevent buffer overflow
      const clampedDelayMsL = Math.max(1, Math.min(this.maxDelayMs, delayMsL));
      const clampedDelayMsR = Math.max(1, Math.min(this.maxDelayMs, delayMsR));

      const delaySamplesL = (clampedDelayMsL / 1000) * this.sampleRate;
      const delaySamplesR = (clampedDelayMsR / 1000) * this.sampleRate;

      // Read from delay buffer with linear interpolation
      chorusL += this.readDelayBuffer(this.bufferL, delaySamplesL);
      chorusR += this.readDelayBuffer(this.bufferR, delaySamplesR);
    }

    // Average chorus voices
    chorusL /= this.numVoices;
    chorusR /= this.numVoices;

    // Advance write index
    this.writeIndex = (this.writeIndex + 1) % this.maxDelaySamples;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + chorusL * this.mix;
    const outputR = inputR * (1 - this.mix) + chorusR * this.mix;

    return [outputL, outputR];
  }

  readDelayBuffer(buffer, delaySamples) {
    const readPos = this.writeIndex - delaySamples;
    const readIndex1 =
      (Math.floor(readPos) + this.maxDelaySamples) % this.maxDelaySamples;
    const readIndex2 = (readIndex1 + 1) % this.maxDelaySamples;

    const frac = readPos - Math.floor(readPos);
    return buffer[readIndex1] * (1 - frac) + buffer[readIndex2] * frac;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'rate':
        this.rate = Math.max(0.1, Math.min(5, value));
        break;
      case 'depth':
        this.depth = Math.max(0, Math.min(1, value));
        break;
      case 'delay':
        this.delay = Math.max(5, Math.min(50, value));
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
    this.lfoPhases.fill(0);

    // Initialize LFO phases with offsets for stereo width
    for (let i = 0; i < this.numVoices; i++) {
      this.lfoPhases[i * 2] = i / this.numVoices; // Left
      this.lfoPhases[i * 2 + 1] = (i + 0.5) / this.numVoices; // Right (offset)
    }
  }

  static getMetadata() {
    return {
      id: 'chorus',
      name: 'Chorus',
      parameters: [
        {
          name: 'rate',
          label: 'Rate',
          min: 0.1,
          max: 5,
          default: 0.5,
          unit: 'Hz',
        },
        { name: 'depth', label: 'Depth', min: 0, max: 1, default: 0.7 },
        {
          name: 'delay',
          label: 'Delay',
          min: 5,
          max: 50,
          default: 20,
          unit: 'ms',
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.2 },
      ],
    };
  }
}
