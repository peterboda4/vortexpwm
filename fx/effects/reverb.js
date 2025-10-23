import { FXBase } from '../fx-base.js';

/**
 * Hall/Shimmer Reverb
 * Combines diffusion network with pitch-shifted feedback for ethereal sound
 */
export class ReverbEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    const scale = sampleRate / 44100;

    // Early reflections (shorter delays for initial ambience)
    this.earlyDelaysL = [197, 337, 457, 673].map((d) => Math.floor(d * scale));
    this.earlyDelaysR = [211, 359, 479, 701].map((d) => Math.floor(d * scale));

    // Late reverb diffusion (longer, prime-number delays for dense tail)
    this.diffusionDelaysL = [1051, 1249, 1597, 1999, 2399].map((d) =>
      Math.floor(d * scale)
    );
    this.diffusionDelaysR = [1097, 1301, 1663, 2053, 2473].map((d) =>
      Math.floor(d * scale)
    );

    // Create buffers
    this.earlyBuffersL = this.earlyDelaysL.map(
      (delay) => new Float32Array(delay)
    );
    this.earlyBuffersR = this.earlyDelaysR.map(
      (delay) => new Float32Array(delay)
    );
    this.diffusionBuffersL = this.diffusionDelaysL.map(
      (delay) => new Float32Array(delay)
    );
    this.diffusionBuffersR = this.diffusionDelaysR.map(
      (delay) => new Float32Array(delay)
    );

    // Shimmer pitch shift buffer (12 semitones = octave up)
    this.shimmerDelayTime = Math.floor(0.05 * sampleRate); // 50ms
    this.shimmerBufferL = new Float32Array(this.shimmerDelayTime);
    this.shimmerBufferR = new Float32Array(this.shimmerDelayTime);
    this.shimmerPhase = 0;

    // Indices
    this.earlyIndices = 0;
    this.diffusionIndices = 0;

    // Default parameters
    this.size = 0.7; // Room size (0-1)
    this.decay = 0.6; // Decay time (0-0.99)
    this.shimmer = 0.0; // Shimmer amount (0-1)
    this.mix = 0.2; // Dry/wet mix (0-1)

    // Damping filter state
    this.dampL = 0;
    this.dampR = 0;

    this.updateParameters();
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Pre-delay and input diffusion
    const inputMono = (inputL + inputR) * 0.5;

    // Early reflections
    let earlyL = 0;
    let earlyR = 0;

    for (let i = 0; i < this.earlyDelaysL.length; i++) {
      const bufL = this.earlyBuffersL[i];
      const bufR = this.earlyBuffersR[i];
      const idxL = this.earlyIndices % this.earlyDelaysL[i];
      const idxR = this.earlyIndices % this.earlyDelaysR[i];

      earlyL += bufL[idxL] * 0.25;
      earlyR += bufR[idxR] * 0.25;

      bufL[idxL] = inputMono;
      bufR[idxR] = inputMono;
    }

    // Late reverb diffusion network with feedback
    let diffuseL = earlyL;
    let diffuseR = earlyR;

    for (let i = 0; i < this.diffusionDelaysL.length; i++) {
      const bufL = this.diffusionBuffersL[i];
      const bufR = this.diffusionBuffersR[i];
      const idxL = this.diffusionIndices % this.diffusionDelaysL[i];
      const idxR = this.diffusionIndices % this.diffusionDelaysR[i];

      const tapL = bufL[idxL];
      const tapR = bufR[idxR];

      // Damping (lowpass filter)
      this.dampL = tapL * 0.3 + this.dampL * 0.7;
      this.dampR = tapR * 0.3 + this.dampR * 0.7;

      diffuseL += this.dampL * 0.2;
      diffuseR += this.dampR * 0.2;

      // Write back with feedback
      bufL[idxL] = inputMono + this.dampL * this.feedback;
      bufR[idxR] = inputMono + this.dampR * this.feedback;
    }

    // Shimmer (pitch shift up one octave)
    let shimmerL = 0;
    let shimmerR = 0;

    if (this.shimmer > 0.001) {
      // Simple pitch shifter using time-domain technique
      const readPos = this.shimmerPhase * 0.5; // Half speed = octave up
      const idx1 = Math.floor(readPos) % this.shimmerDelayTime;
      const idx2 = (idx1 + 1) % this.shimmerDelayTime;
      const frac = readPos - Math.floor(readPos);

      shimmerL =
        this.shimmerBufferL[idx1] * (1 - frac) +
        this.shimmerBufferL[idx2] * frac;
      shimmerR =
        this.shimmerBufferR[idx1] * (1 - frac) +
        this.shimmerBufferR[idx2] * frac;

      // Write current diffused signal
      const writeIdx = this.shimmerPhase % this.shimmerDelayTime;
      this.shimmerBufferL[writeIdx] = diffuseL;
      this.shimmerBufferR[writeIdx] = diffuseR;

      this.shimmerPhase = (this.shimmerPhase + 1) % this.shimmerDelayTime;
    }

    // Mix shimmer back into diffusion
    diffuseL += shimmerL * this.shimmer * 0.3;
    diffuseR += shimmerR * this.shimmer * 0.3;

    // Advance indices
    this.earlyIndices++;
    this.diffusionIndices++;

    // Final mix (wet signal reduced to ~30-35% to prevent excessive loudness)
    const wetGain = 0.33; // Reduce wet signal to 33%
    const outputL = inputL * (1 - this.mix) + diffuseL * this.mix * wetGain;
    const outputR = inputR * (1 - this.mix) + diffuseR * this.mix * wetGain;

    return [outputL, outputR];
  }

  updateParameters() {
    // Convert size to feedback (0.3 to 0.85)
    this.feedback = 0.3 + this.size * 0.55;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'size':
        this.size = Math.max(0, Math.min(1, value));
        this.updateParameters();
        break;
      case 'decay':
        this.decay = Math.max(0, Math.min(0.99, value));
        this.feedback = 0.3 + this.decay * 0.6;
        break;
      case 'shimmer':
        this.shimmer = Math.max(0, Math.min(1, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.earlyBuffersL.forEach((buf) => buf.fill(0));
    this.earlyBuffersR.forEach((buf) => buf.fill(0));
    this.diffusionBuffersL.forEach((buf) => buf.fill(0));
    this.diffusionBuffersR.forEach((buf) => buf.fill(0));
    this.shimmerBufferL.fill(0);
    this.shimmerBufferR.fill(0);
    this.earlyIndices = 0;
    this.diffusionIndices = 0;
    this.shimmerPhase = 0;
    this.dampL = 0;
    this.dampR = 0;
  }

  static getMetadata() {
    return {
      id: 'reverb',
      name: 'Hall/Shimmer',
      parameters: [
        {
          name: 'size',
          label: 'Size',
          min: 0,
          max: 1,
          default: 0.7,
        },
        { name: 'decay', label: 'Decay', min: 0, max: 0.99, default: 0.6 },
        { name: 'shimmer', label: 'Shimmer', min: 0, max: 1, default: 0 },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.2 },
      ],
    };
  }
}
