import { FXBase } from '../fx-base.js';

/**
 * Pitch Shifter Effect
 * Uses granular synthesis approach with overlapping windowed grains
 * for smooth pitch shifting without changing duration
 */
export class PitchShifterEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // Buffer size for pitch shifting (larger = better quality, more latency)
    this.bufferSize = 8192;
    this.bufferL = new Float32Array(this.bufferSize);
    this.bufferR = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // Grain parameters
    this.grainSize = 2048; // Size of each grain in samples
    this.overlapFactor = 4; // Number of overlapping grains
    this.hopSize = Math.floor(this.grainSize / this.overlapFactor);

    // Output grain state
    this.grainPhase = 0;
    this.grainBuffer = new Float32Array(this.grainSize);
    this.grainBufferL = new Float32Array(this.grainSize);
    this.grainBufferR = new Float32Array(this.grainSize);
    this.outputPhase = 0;

    // Crossfade buffers for smooth transitions
    this.fadeBuffer = this.createHannWindow(this.grainSize);

    // Default parameters
    // enabled is inherited from FXBase (true by default)
    this.coarse = 0; // Coarse pitch shift in semitones (-24 to +24)
    this.fine = 0; // Fine pitch shift in cents (-50 to +50)
    this.dry = 1.0; // Dry level (0-1)
    this.wet = 0.0; // Wet level (0-1) - default to 0 so effect is neutral when added
  }

  createHannWindow(size) {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Write input to circular buffers
    this.bufferL[this.writeIndex] = inputL;
    this.bufferR[this.writeIndex] = inputR;
    this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

    // Calculate pitch ratio from semitones and cents
    const semitones = this.coarse + this.fine / 100.0;
    const pitchRatio = Math.pow(2, semitones / 12);

    // No pitch shift - just pass through with dry/wet mix
    if (Math.abs(semitones) < 0.01) {
      return [
        inputL * this.dry + inputL * this.wet,
        inputR * this.dry + inputR * this.wet,
      ];
    }

    // Read grains at modified rate
    let shiftedL = 0;
    let shiftedR = 0;

    // Use multiple overlapping grains for smooth output
    for (let grain = 0; grain < this.overlapFactor; grain++) {
      const grainOffset = grain * this.hopSize;
      const readPhase =
        (this.grainPhase + grainOffset * pitchRatio) % this.grainSize;

      // Calculate read position in buffer
      const samplesToRead = this.grainSize / 2; // Look back in buffer
      const readPos = this.writeIndex - samplesToRead + readPhase * pitchRatio;

      // Read with linear interpolation
      const sampleL = this.readBuffer(this.bufferL, readPos);
      const sampleR = this.readBuffer(this.bufferR, readPos);

      // Apply Hann window for smooth crossfading
      const windowPos = Math.floor(
        (readPhase / this.grainSize) * (this.fadeBuffer.length - 1)
      );
      const windowValue = this.fadeBuffer[windowPos] || 0;

      shiftedL += sampleL * windowValue;
      shiftedR += sampleR * windowValue;
    }

    // Normalize by overlap factor
    shiftedL /= this.overlapFactor;
    shiftedR /= this.overlapFactor;

    // Advance grain phase
    this.grainPhase = (this.grainPhase + 1) % this.grainSize;

    // Mix dry/wet
    const outputL = inputL * this.dry + shiftedL * this.wet;
    const outputR = inputR * this.dry + shiftedR * this.wet;

    return [outputL, outputR];
  }

  readBuffer(buffer, position) {
    // Wrap position to buffer size
    let pos = position;
    while (pos < 0) pos += this.bufferSize;
    pos = pos % this.bufferSize;

    const index1 = Math.floor(pos);
    const index2 = (index1 + 1) % this.bufferSize;
    const frac = pos - index1;

    return buffer[index1] * (1 - frac) + buffer[index2] * frac;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'enabled':
        this.enabled = Math.round(value);
        break;
      case 'coarse':
        this.coarse = Math.max(-24, Math.min(24, value));
        break;
      case 'fine':
        this.fine = Math.max(-50, Math.min(50, value));
        break;
      case 'dry':
        this.dry = Math.max(0, Math.min(1, value));
        break;
      case 'wet':
        this.wet = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.bufferL.fill(0);
    this.bufferR.fill(0);
    this.writeIndex = 0;
    this.grainPhase = 0;
    this.outputPhase = 0;
  }

  static getMetadata() {
    return {
      id: 'pitchshifter',
      name: 'Pitch Shifter',
      parameters: [
        {
          name: 'coarse',
          label: 'Coarse',
          min: -24,
          max: 24,
          default: 0,
          step: 1,
          unit: 'st',
        },
        {
          name: 'fine',
          label: 'Fine',
          min: -50,
          max: 50,
          default: 0,
          step: 1,
          unit: 'ct',
        },
        { name: 'dry', label: 'Dry', min: 0, max: 1, default: 1.0 },
        { name: 'wet', label: 'Wet', min: 0, max: 1, default: 0.0 },
      ],
    };
  }
}
