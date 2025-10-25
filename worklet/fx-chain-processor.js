/**
 * FX Chain AudioWorklet Processor
 * IMPORTANT: This file must be self-contained (no imports) for AudioWorklet
 * All effect classes are inlined below
 */

// ============================================================================
// BASE CLASS
// ============================================================================

class FXBase {
  constructor(sampleRate, id) {
    this.sampleRate = sampleRate;
    this.id = id;
    this.enabled = true;
    this.parameters = new Map();
  }

  process(inputL, inputR) {
    throw new Error('process() must be implemented by subclass');
  }

  setParameter(name, value) {
    this.parameters.set(name, value);
    this.onParameterChange(name, value);
  }

  onParameterChange(name, value) {}

  reset() {}
}

// ============================================================================
// HARD CLIP EFFECT
// ============================================================================

class HardClipEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);
    this.drive = 1.0;
    this.threshold = 0.5;
    this.mix = 1.0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    let processedL = inputL * this.drive;
    let processedR = inputR * this.drive;

    processedL = Math.max(
      -this.threshold,
      Math.min(this.threshold, processedL)
    );
    processedR = Math.max(
      -this.threshold,
      Math.min(this.threshold, processedR)
    );

    processedL /= this.threshold;
    processedR /= this.threshold;

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
}

// ============================================================================
// PHASER EFFECT
// ============================================================================

class PhaserEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.numStages = 4;
    this.allpassL = Array(this.numStages)
      .fill(0)
      .map(() => ({ a1: 0, zm1: 0 }));
    this.allpassR = Array(this.numStages)
      .fill(0)
      .map(() => ({ a1: 0, zm1: 0 }));

    this.lfoPhase = 0;
    this.rate = 0.5;
    this.depth = 0.7;
    this.feedback = 0.5;
    this.mix = 0.5;
    this.minFreq = 200;
    this.maxFreq = 2000;
    this.feedbackL = 0;
    this.feedbackR = 0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const lfoValue = Math.sin(this.lfoPhase * 2 * Math.PI);
    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    const freqRange = this.maxFreq - this.minFreq;
    const currentFreq =
      this.minFreq + (lfoValue * 0.5 + 0.5) * freqRange * this.depth;

    const omega = (2 * Math.PI * currentFreq) / this.sampleRate;
    const tanHalfOmega = Math.tan(omega / 2);
    const a1 = (tanHalfOmega - 1) / (tanHalfOmega + 1);

    let outputL = inputL + this.feedbackL * this.feedback;
    for (let i = 0; i < this.numStages; i++) {
      const stage = this.allpassL[i];
      const input = outputL;
      outputL = a1 * input + stage.zm1;
      stage.zm1 = input - a1 * outputL;
    }
    this.feedbackL = outputL;

    let outputR = inputR + this.feedbackR * this.feedback;
    for (let i = 0; i < this.numStages; i++) {
      const stage = this.allpassR[i];
      const input = outputR;
      outputR = a1 * input + stage.zm1;
      stage.zm1 = input - a1 * outputR;
    }
    this.feedbackR = outputR;

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
    this.allpassL.forEach((stage) => (stage.zm1 = 0));
    this.allpassR.forEach((stage) => (stage.zm1 = 0));
    this.feedbackL = 0;
    this.feedbackR = 0;
    this.lfoPhase = 0;
  }
}

// ============================================================================
// BIT CRUSHER EFFECT
// ============================================================================

class BitCrusherEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.bitDepth = 16;
    this.sampleRateReduction = 1;
    this.mix = 1.0;
    this.holdCounterL = 0;
    this.holdCounterR = 0;
    this.heldSampleL = 0;
    this.heldSampleR = 0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

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

    const levels = Math.pow(2, this.bitDepth);
    crushedL = Math.round(crushedL * levels) / levels;
    crushedR = Math.round(crushedR * levels) / levels;

    const outputL = inputL * (1 - this.mix) + crushedL * this.mix;
    const outputR = inputR * (1 - this.mix) + crushedR * this.mix;

    return [outputL, outputR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'bitDepth':
        this.bitDepth = Math.max(1, Math.min(16, Math.round(value)));
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
}

// ============================================================================
// CHORUS EFFECT
// ============================================================================

class ChorusEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.numVoices = 2;
    this.maxDelayMs = 50;
    this.maxDelaySamples = Math.floor(
      (this.maxDelayMs / 1000) * this.sampleRate
    );

    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.writeIndex = 0;

    this.lfoPhases = Array(this.numVoices * 2).fill(0);
    for (let i = 0; i < this.numVoices; i++) {
      this.lfoPhases[i * 2] = i / this.numVoices;
      this.lfoPhases[i * 2 + 1] = (i + 0.5) / this.numVoices;
    }

    this.rate = 0.5;
    this.depth = 0.7;
    this.delay = 20;
    this.mix = 0.5;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    this.bufferL[this.writeIndex] = inputL;
    this.bufferR[this.writeIndex] = inputR;

    let chorusL = 0;
    let chorusR = 0;

    for (let voice = 0; voice < this.numVoices; voice++) {
      const lfoIndexL = voice * 2;
      const lfoL = Math.sin(this.lfoPhases[lfoIndexL] * 2 * Math.PI);
      this.lfoPhases[lfoIndexL] += this.rate / this.sampleRate;
      if (this.lfoPhases[lfoIndexL] >= 1) this.lfoPhases[lfoIndexL] -= 1;

      const lfoIndexR = voice * 2 + 1;
      const lfoR = Math.sin(this.lfoPhases[lfoIndexR] * 2 * Math.PI);
      this.lfoPhases[lfoIndexR] += this.rate / this.sampleRate;
      if (this.lfoPhases[lfoIndexR] >= 1) this.lfoPhases[lfoIndexR] -= 1;

      const modulationRange = this.delay * 0.3 * this.depth;
      const delayMsL = this.delay + lfoL * modulationRange;
      const delayMsR = this.delay + lfoR * modulationRange;

      const delaySamplesL = (delayMsL / 1000) * this.sampleRate;
      const delaySamplesR = (delayMsR / 1000) * this.sampleRate;

      chorusL += this.readDelayBuffer(this.bufferL, delaySamplesL);
      chorusR += this.readDelayBuffer(this.bufferR, delaySamplesR);
    }

    chorusL /= this.numVoices;
    chorusR /= this.numVoices;

    this.writeIndex = (this.writeIndex + 1) % this.maxDelaySamples;

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
    for (let i = 0; i < this.numVoices; i++) {
      this.lfoPhases[i * 2] = i / this.numVoices;
      this.lfoPhases[i * 2 + 1] = (i + 0.5) / this.numVoices;
    }
  }
}

// ============================================================================
// DELAY EFFECT
// ============================================================================

class DelayEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.maxDelaySamples = Math.floor(sampleRate * 2);
    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.writeIndexL = 0;
    this.writeIndexR = 0;

    this.delayTimeL = 0.25;
    this.delayTimeR = 0.375;
    this.feedback = 0.3;
    this.crossFeedback = 0.0;
    this.mix = 0.3;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const delaySamplesL = Math.floor(this.delayTimeL * this.sampleRate);
    const delaySamplesR = Math.floor(this.delayTimeR * this.sampleRate);

    const readIndexL =
      (this.writeIndexL - delaySamplesL + this.maxDelaySamples) %
      this.maxDelaySamples;
    const readIndexR =
      (this.writeIndexR - delaySamplesR + this.maxDelaySamples) %
      this.maxDelaySamples;

    const delayedL = this.bufferL[readIndexL];
    const delayedR = this.bufferR[readIndexR];

    this.bufferL[this.writeIndexL] =
      inputL + delayedL * this.feedback + delayedR * this.crossFeedback;
    this.bufferR[this.writeIndexR] =
      inputR + delayedR * this.feedback + delayedL * this.crossFeedback;

    this.writeIndexL = (this.writeIndexL + 1) % this.maxDelaySamples;
    this.writeIndexR = (this.writeIndexR + 1) % this.maxDelaySamples;

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
    this.writeIndexL = 0;
    this.writeIndexR = 0;
  }
}

// ============================================================================
// REVERB EFFECT (Freeverb)
// ============================================================================

class ReverbEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    const scale = sampleRate / 44100;

    this.combDelaysL = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(
      (d) => Math.floor(d * scale)
    );
    this.combDelaysR = [
      1116 + 23,
      1188 + 23,
      1277 + 23,
      1356 + 23,
      1422 + 23,
      1491 + 23,
      1557 + 23,
      1617 + 23,
    ].map((d) => Math.floor(d * scale));

    this.allpassDelaysL = [556, 441, 341, 225].map((d) =>
      Math.floor(d * scale)
    );
    this.allpassDelaysR = [556 + 23, 441 + 23, 341 + 23, 225 + 23].map((d) =>
      Math.floor(d * scale)
    );

    this.combBuffersL = this.combDelaysL.map(
      (delay) => new Float32Array(delay)
    );
    this.combBuffersR = this.combDelaysR.map(
      (delay) => new Float32Array(delay)
    );
    this.combIndicesL = Array(8).fill(0);
    this.combIndicesR = Array(8).fill(0);

    this.allpassBuffersL = this.allpassDelaysL.map(
      (delay) => new Float32Array(delay)
    );
    this.allpassBuffersR = this.allpassDelaysR.map(
      (delay) => new Float32Array(delay)
    );
    this.allpassIndicesL = Array(4).fill(0);
    this.allpassIndicesR = Array(4).fill(0);

    this.roomSize = 0.5;
    this.damping = 0.5;
    this.width = 1.0;
    this.mix = 0.3;

    this.dampingL = Array(8).fill(0);
    this.dampingR = Array(8).fill(0);

    this.updateParameters();
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const inputMono = (inputL + inputR) * 0.5;

    let combOutL = 0;
    let combOutR = 0;

    for (let i = 0; i < 8; i++) {
      const bufL = this.combBuffersL[i];
      const delayL = this.combDelaysL[i];
      let idxL = this.combIndicesL[i];

      let outputL = bufL[idxL];
      this.dampingL[i] =
        outputL * (1 - this.damping) + this.dampingL[i] * this.damping;
      bufL[idxL] = inputMono + this.dampingL[i] * this.feedback;

      combOutL += outputL;
      this.combIndicesL[i] = (idxL + 1) % delayL;

      const bufR = this.combBuffersR[i];
      const delayR = this.combDelaysR[i];
      let idxR = this.combIndicesR[i];

      let outputR = bufR[idxR];
      this.dampingR[i] =
        outputR * (1 - this.damping) + this.dampingR[i] * this.damping;
      bufR[idxR] = inputMono + this.dampingR[i] * this.feedback;

      combOutR += outputR;
      this.combIndicesR[i] = (idxR + 1) % delayR;
    }

    let allpassOutL = combOutL;
    let allpassOutR = combOutR;

    for (let i = 0; i < 4; i++) {
      const bufL = this.allpassBuffersL[i];
      const delayL = this.allpassDelaysL[i];
      let idxL = this.allpassIndicesL[i];

      const bufferedL = bufL[idxL];
      const inputL = allpassOutL;
      allpassOutL = -inputL + bufferedL;
      bufL[idxL] = inputL + bufferedL * 0.5;

      this.allpassIndicesL[i] = (idxL + 1) % delayL;

      const bufR = this.allpassBuffersR[i];
      const delayR = this.allpassDelaysR[i];
      let idxR = this.allpassIndicesR[i];

      const bufferedR = bufR[idxR];
      const inputR = allpassOutR;
      allpassOutR = -inputR + bufferedR;
      bufR[idxR] = inputR + bufferedR * 0.5;

      this.allpassIndicesR[i] = (idxR + 1) % delayR;
    }

    const wet1 = this.mix * (this.width / 2 + 0.5);
    const wet2 = this.mix * ((1 - this.width) / 2);

    const outputL =
      inputL * (1 - this.mix) + allpassOutL * wet1 + allpassOutR * wet2;
    const outputR =
      inputR * (1 - this.mix) + allpassOutR * wet1 + allpassOutL * wet2;

    return [outputL, outputR];
  }

  updateParameters() {
    this.feedback = 0.28 + this.roomSize * 0.7;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'roomSize':
        this.roomSize = Math.max(0, Math.min(1, value));
        this.updateParameters();
        break;
      case 'damping':
        this.damping = Math.max(0, Math.min(1, value));
        break;
      case 'width':
        this.width = Math.max(0, Math.min(1, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.combBuffersL.forEach((buf) => buf.fill(0));
    this.combBuffersR.forEach((buf) => buf.fill(0));
    this.allpassBuffersL.forEach((buf) => buf.fill(0));
    this.allpassBuffersR.forEach((buf) => buf.fill(0));
    this.combIndicesL.fill(0);
    this.combIndicesR.fill(0);
    this.allpassIndicesL.fill(0);
    this.allpassIndicesR.fill(0);
    this.dampingL.fill(0);
    this.dampingR.fill(0);
  }
}

// ============================================================================
// FLANGER EFFECT
// ============================================================================

class FlangerEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.maxDelaySamples = Math.floor(sampleRate * 0.02);
    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.writeIndex = 0;

    this.lfoPhase = 0;
    this.rate = 0.5;
    this.depth = 3.0;
    this.feedback = 0.7;
    this.mix = 0.5;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const lfoValue = Math.sin(this.lfoPhase * 2 * Math.PI);
    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    const depthSamples = (this.depth / 1000) * this.sampleRate;
    const delaySamples = depthSamples * (lfoValue * 0.5 + 0.5);

    const clampedDelay = Math.max(
      1,
      Math.min(this.maxDelaySamples - 2, delaySamples)
    );

    const readPos = this.writeIndex - clampedDelay;
    const readIndex =
      (Math.floor(readPos) + this.maxDelaySamples) % this.maxDelaySamples;
    const readIndexNext = (readIndex + 1) % this.maxDelaySamples;
    const frac = readPos - Math.floor(readPos);

    const delayedL =
      this.bufferL[readIndex] * (1 - frac) + this.bufferL[readIndexNext] * frac;
    const delayedR =
      this.bufferR[readIndex] * (1 - frac) + this.bufferR[readIndexNext] * frac;

    this.bufferL[this.writeIndex] = inputL + delayedL * this.feedback;
    this.bufferR[this.writeIndex] = inputR + delayedR * this.feedback;

    this.writeIndex = (this.writeIndex + 1) % this.maxDelaySamples;

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
}

// ============================================================================
// TREMOLO EFFECT
// ============================================================================

class TremoloEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.lfoPhase = 0;
    this.rate = 4;
    this.depth = 0.7;
    this.stereoPhase = 0;
    this.waveform = 0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const lfoL = this.getLFOValue(this.lfoPhase);
    const lfoR = this.getLFOValue((this.lfoPhase + this.stereoPhase) % 1.0);

    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    const gainL = 1 - this.depth + lfoL * this.depth;
    const gainR = 1 - this.depth + lfoR * this.depth;

    const outputL = inputL * gainL;
    const outputR = inputR * gainR;

    return [outputL, outputR];
  }

  getLFOValue(phase) {
    const waveformType = Math.round(this.waveform);

    switch (waveformType) {
      case 0:
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;
      case 1:
        return phase < 0.5 ? phase * 2 : 2 - phase * 2;
      case 2:
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
}

// ============================================================================
// AUTO-WAH EFFECT
// ============================================================================

class AutoWahEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.lfoPhase = 0;
    this.filterStateL = { y1: 0, y2: 0, x1: 0, x2: 0 };
    this.filterStateR = { y1: 0, y2: 0, x1: 0, x2: 0 };

    this.rate = 0.5;
    this.centerFreq = 800;
    this.range = 2.5;
    this.depth = 0.8;
    this.resonance = 3.0;
    this.waveform = 0;
    this.mix = 1.0;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const lfo = this.getLFOValue(this.lfoPhase);

    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1) this.lfoPhase -= 1;

    const rangeSemitones = this.range * 12;
    const modulationSemitones = (lfo - 0.5) * 2 * rangeSemitones * this.depth;
    const freq = this.centerFreq * Math.pow(2, modulationSemitones / 12);

    const outputL = this.applyResonantLowpass(inputL, freq, this.filterStateL);
    const outputR = this.applyResonantLowpass(inputR, freq, this.filterStateR);

    const finalL = inputL * (1 - this.mix) + outputL * this.mix;
    const finalR = inputR * (1 - this.mix) + outputR * this.mix;

    return [finalL, finalR];
  }

  getLFOValue(phase) {
    const waveformType = Math.round(this.waveform);

    switch (waveformType) {
      case 0:
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;
      case 1:
        return phase < 0.5 ? phase * 2 : 2 - phase * 2;
      default:
        return Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;
    }
  }

  applyResonantLowpass(input, cutoffFreq, state) {
    const freq = Math.max(20, Math.min(this.sampleRate * 0.45, cutoffFreq));
    const omega = (2 * Math.PI * freq) / this.sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);

    const Q = Math.max(0.5, Math.min(10, this.resonance));
    const alpha = sinOmega / (2 * Q);

    const b0 = (1 - cosOmega) / 2;
    const b1 = 1 - cosOmega;
    const b2 = (1 - cosOmega) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosOmega;
    const a2 = 1 - alpha;

    const b0n = b0 / a0;
    const b1n = b1 / a0;
    const b2n = b2 / a0;
    const a1n = a1 / a0;
    const a2n = a2 / a0;

    const output =
      b0n * input +
      b1n * state.x1 +
      b2n * state.x2 -
      a1n * state.y1 -
      a2n * state.y2;

    state.x2 = state.x1;
    state.x1 = input;
    state.y2 = state.y1;
    state.y1 = output;

    return output;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'rate':
        this.rate = Math.max(0.1, Math.min(10, value));
        break;
      case 'centerFreq':
        this.centerFreq = Math.max(200, Math.min(5000, value));
        break;
      case 'range':
        this.range = Math.max(0.5, Math.min(4, value));
        break;
      case 'depth':
        this.depth = Math.max(0, Math.min(1, value));
        break;
      case 'resonance':
        this.resonance = Math.max(0.5, Math.min(10, value));
        break;
      case 'waveform':
        this.waveform = Math.max(0, Math.min(1, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.lfoPhase = 0;
    this.filterStateL = { y1: 0, y2: 0, x1: 0, x2: 0 };
    this.filterStateR = { y1: 0, y2: 0, x1: 0, x2: 0 };
  }
}

// ============================================================================
// PITCH SHIFTER EFFECT
// ============================================================================

class PitchShifterEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.bufferSize = 8192;
    this.bufferL = new Float32Array(this.bufferSize);
    this.bufferR = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    this.grainSize = 2048;
    this.overlapFactor = 4;
    this.hopSize = Math.floor(this.grainSize / this.overlapFactor);

    this.grainPhase = 0;
    this.grainBuffer = new Float32Array(this.grainSize);
    this.grainBufferL = new Float32Array(this.grainSize);
    this.grainBufferR = new Float32Array(this.grainSize);
    this.outputPhase = 0;

    this.fadeBuffer = this.createHannWindow(this.grainSize);

    this.coarse = 0;
    this.fine = 0;
    this.dry = 1.0;
    this.wet = 0.0;
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

    this.bufferL[this.writeIndex] = inputL;
    this.bufferR[this.writeIndex] = inputR;
    this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

    const semitones = this.coarse + this.fine / 100.0;
    const pitchRatio = Math.pow(2, semitones / 12);

    if (Math.abs(semitones) < 0.01) {
      return [
        inputL * this.dry + inputL * this.wet,
        inputR * this.dry + inputR * this.wet,
      ];
    }

    let shiftedL = 0;
    let shiftedR = 0;

    for (let grain = 0; grain < this.overlapFactor; grain++) {
      const grainOffset = grain * this.hopSize;
      const readPhase =
        (this.grainPhase + grainOffset * pitchRatio) % this.grainSize;

      const samplesToRead = this.grainSize / 2;
      const readPos = this.writeIndex - samplesToRead + readPhase * pitchRatio;

      const sampleL = this.readBuffer(this.bufferL, readPos);
      const sampleR = this.readBuffer(this.bufferR, readPos);

      const windowPos = Math.floor(
        (readPhase / this.grainSize) * (this.fadeBuffer.length - 1)
      );
      const windowValue = this.fadeBuffer[windowPos] || 0;

      shiftedL += sampleL * windowValue;
      shiftedR += sampleR * windowValue;
    }

    shiftedL /= this.overlapFactor;
    shiftedR /= this.overlapFactor;

    this.grainPhase = (this.grainPhase + 1) % this.grainSize;

    const outputL = inputL * this.dry + shiftedL * this.wet;
    const outputR = inputR * this.dry + shiftedR * this.wet;

    return [outputL, outputR];
  }

  readBuffer(buffer, position) {
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
}

// ============================================================================
// FREQUENCY SHIFTER EFFECT
// ============================================================================

class FreqShifterEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    this.numStages = 12;
    this.allpassIL = this.createAllpassChain(this.numStages);
    this.allpassQL = this.createAllpassChain(this.numStages);
    this.allpassIR = this.createAllpassChain(this.numStages);
    this.allpassQR = this.createAllpassChain(this.numStages);

    this.oscPhase = 0;
    this.shift = 100;
    this.mix = 0.5;

    this.hilbertCoeffs = [
      0.6923878, 0.9360654322959, 0.9882295226861, 0.9987488452737,
      0.9996936637686, 0.9999305067355, 0.9999847344463, 0.9999965063808,
      0.9999992659768, 0.9999998386534, 0.9999999670162, 0.9999999939119,
    ];
  }

  createAllpassChain(numStages) {
    return Array(numStages)
      .fill(0)
      .map(() => ({ zm1: 0 }));
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    const shiftedL = this.processChannel(
      inputL,
      this.allpassIL,
      this.allpassQL
    );
    const shiftedR = this.processChannel(
      inputR,
      this.allpassIR,
      this.allpassQR
    );

    const shiftFreq = this.shift;
    this.oscPhase += shiftFreq / this.sampleRate;
    if (this.oscPhase >= 1) this.oscPhase -= 1;
    if (this.oscPhase < 0) this.oscPhase += 1;

    const outputL = inputL * (1 - this.mix) + shiftedL * this.mix;
    const outputR = inputR * (1 - this.mix) + shiftedR * this.mix;

    return [outputL, outputR];
  }

  processChannel(input, allpassI, allpassQ) {
    const oscI = Math.cos(this.oscPhase * 2 * Math.PI);
    const oscQ = Math.sin(this.oscPhase * 2 * Math.PI);

    let signalI = input;
    for (let i = 0; i < this.numStages; i++) {
      const stage = allpassI[i];
      const a = this.hilbertCoeffs[i];
      const temp = signalI;
      signalI = a * temp + stage.zm1;
      stage.zm1 = temp - a * signalI;
    }

    let signalQ = input;
    for (let i = 0; i < this.numStages; i++) {
      const stage = allpassQ[i];
      const a = this.hilbertCoeffs[i];
      const temp = signalQ;
      signalQ = a * temp + stage.zm1;
      stage.zm1 = temp - a * signalQ;
    }

    const shifted = signalI * oscI - signalQ * oscQ;

    return shifted;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'shift':
        this.shift = Math.max(-500, Math.min(500, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.allpassIL.forEach((stage) => (stage.zm1 = 0));
    this.allpassQL.forEach((stage) => (stage.zm1 = 0));
    this.allpassIR.forEach((stage) => (stage.zm1 = 0));
    this.allpassQR.forEach((stage) => (stage.zm1 = 0));
    this.oscPhase = 0;
  }
}

// ============================================================================
// FX CHAIN PROCESSOR
// ============================================================================

class FXChainProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.effectsChain = [];
    this.effectsRegistry = new Map();

    this.registerEffects();

    this.port.onmessage = (e) => this.handleMessage(e.data);
  }

  registerEffects() {
    this.effectsRegistry.set('hardclip', HardClipEffect);
    this.effectsRegistry.set('phaser', PhaserEffect);
    this.effectsRegistry.set('bitcrusher', BitCrusherEffect);
    this.effectsRegistry.set('chorus', ChorusEffect);
    this.effectsRegistry.set('delay', DelayEffect);
    this.effectsRegistry.set('reverb', ReverbEffect);
    this.effectsRegistry.set('flanger', FlangerEffect);
    this.effectsRegistry.set('tremolo', TremoloEffect);
    this.effectsRegistry.set('autowah', AutoWahEffect);
    this.effectsRegistry.set('freqshifter', FreqShifterEffect);
    this.effectsRegistry.set('pitchshifter', PitchShifterEffect);
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'addEffect':
        this.addEffect(msg.effectId, msg.instanceId, msg.position);
        break;
      case 'removeEffect':
        this.removeEffect(msg.instanceId);
        break;
      case 'reorderChain':
        this.reorderChain(msg.order);
        break;
      case 'setParameter':
        this.setEffectParameter(msg.instanceId, msg.param, msg.value);
        break;
      case 'setEnabled':
        this.setEffectEnabled(msg.instanceId, msg.enabled);
        break;
      case 'clear':
        this.clearChain();
        break;
    }
  }

  addEffect(effectId, instanceId, position = -1) {
    const EffectClass = this.effectsRegistry.get(effectId);
    if (!EffectClass) return;

    const effect = new EffectClass(sampleRate, instanceId);

    if (position < 0 || position >= this.effectsChain.length) {
      this.effectsChain.push(effect);
    } else {
      this.effectsChain.splice(position, 0, effect);
    }

    this.port.postMessage({
      type: 'effectAdded',
      instanceId,
      effectId,
      position: this.effectsChain.indexOf(effect),
    });
  }

  removeEffect(instanceId) {
    const index = this.effectsChain.findIndex((e) => e.id === instanceId);
    if (index >= 0) {
      this.effectsChain.splice(index, 1);
      this.port.postMessage({ type: 'effectRemoved', instanceId });
    }
  }

  reorderChain(newOrder) {
    const newChain = [];
    for (const id of newOrder) {
      const effect = this.effectsChain.find((e) => e.id === id);
      if (effect) newChain.push(effect);
    }
    this.effectsChain = newChain;
  }

  setEffectParameter(instanceId, param, value) {
    const effect = this.effectsChain.find((e) => e.id === instanceId);
    if (effect) effect.setParameter(param, value);
  }

  setEffectEnabled(instanceId, enabled) {
    const effect = this.effectsChain.find((e) => e.id === instanceId);
    if (effect) effect.enabled = enabled;
  }

  clearChain() {
    for (const effect of this.effectsChain) {
      effect.reset();
    }
    this.effectsChain = [];
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) return true;

    const inputL = input[0];
    const inputR = input[1] || input[0];
    const outputL = output[0];
    const outputR = output[1];

    const frameCount = inputL.length;

    for (let i = 0; i < frameCount; i++) {
      let sampleL = inputL[i];
      let sampleR = inputR[i];

      for (const effect of this.effectsChain) {
        if (effect.enabled) {
          [sampleL, sampleR] = effect.process(sampleL, sampleR);
        }
      }

      outputL[i] = sampleL;
      outputR[i] = sampleR;
    }

    return true;
  }

  static get parameterDescriptors() {
    return [];
  }
}

registerProcessor('fx-chain-processor', FXChainProcessor);
