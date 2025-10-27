// worklet/synth-processor-refactored.js - Polyphonic PWM synth (refactored)
// Note: run from a secure context (https or localhost).

// ============================================
// 1. DSP UTILITIES
// ============================================

/**
 * PolyBLEP (Polynomial Bandlimited Step) anti-aliasing
 * Reduces aliasing artifacts at waveform discontinuities
 */
class PolyBLEP {
  /**
   * Calculate PolyBLEP residual for bandlimited step
   * @param {number} t - Phase position relative to discontinuity (normalized to ±1)
   * @param {number} dt - Phase increment per sample
   * @returns {number} - Correction value to subtract from naive waveform
   */
  static residual(t, dt) {
    if (t < dt) {
      // Discontinuity at phase = 0
      t = t / dt;
      return t + t - t * t - 1.0;
    } else if (t > 1.0 - dt) {
      // Discontinuity at phase = 1
      t = (t - 1.0) / dt;
      return t * t + t + t + 1.0;
    }
    return 0.0;
  }
}

/**
 * White noise generator using Linear Congruential Generator (LCG)
 */
class NoiseGenerator {
  constructor() {
    this.state = Math.random() * 4294967296; // 32-bit seed
  }

  /**
   * Generate next noise sample
   * @returns {number} - White noise in range [-1, 1]
   */
  next() {
    // LCG parameters from Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 2147483648.0 - 1.0;
  }
}

// ============================================
// 2. FILTERS
// ============================================

/**
 * IIR Filter (24dB resonant lowpass or 18dB highpass)
 * Cascaded biquad sections with coefficient caching
 */
class IIRFilter {
  constructor() {
    this.reset();
  }

  reset() {
    // First biquad state
    this.x1_1 = 0;
    this.x2_1 = 0;
    this.y1_1 = 0;
    this.y2_1 = 0;

    // Second biquad state
    this.x1_2 = 0;
    this.x2_2 = 0;
    this.y1_2 = 0;
    this.y2_2 = 0;

    // Third biquad state (for 18dB HPF)
    this.x1_3 = 0;
    this.x2_3 = 0;
    this.y1_3 = 0;
    this.y2_3 = 0;

    // Cached coefficients
    this.b0_1 = 1;
    this.b1_1 = 0;
    this.b2_1 = 0;
    this.a1_1 = 0;
    this.a2_1 = 0;

    this.b0_2 = 1;
    this.b1_2 = 0;
    this.b2_2 = 0;
    this.a1_2 = 0;
    this.a2_2 = 0;

    this.b0_3 = 1;
    this.b1_3 = 0;
    this.b2_3 = 0;
    this.a1_3 = 0;
    this.a2_3 = 0;

    this.lastCutoff = -1;
    this.lastResonance = -1;
    this.lastFilterType = -1;
  }

  updateCoefficients(cutoffFreq, resonance, sampleRate, filterType = 0) {
    if (
      Math.abs(cutoffFreq - this.lastCutoff) < 0.1 &&
      Math.abs(resonance - this.lastResonance) < 0.001 &&
      filterType === this.lastFilterType
    ) {
      return;
    }

    this.lastCutoff = cutoffFreq;
    this.lastResonance = resonance;
    this.lastFilterType = filterType;

    cutoffFreq = Math.max(10, Math.min(cutoffFreq, sampleRate * 0.45));
    resonance = Math.max(0, Math.min(resonance, 0.99));

    const omega = (2 * Math.PI * cutoffFreq) / sampleRate;
    const sin = Math.sin(omega);
    const cos = Math.cos(omega);
    const Q = 1 / (2 - 2 * resonance + 0.1);
    const alpha = sin / (2 * Q);
    const norm = 1 / (1 + alpha);

    if (filterType === 0) {
      // 24dB Lowpass (2 biquads in series)
      this.b0_1 = this.b0_2 = (1 - cos) * 0.5 * norm;
      this.b1_1 = this.b1_2 = (1 - cos) * norm;
      this.b2_1 = this.b2_2 = (1 - cos) * 0.5 * norm;
      this.a1_1 = this.a1_2 = -2 * cos * norm;
      this.a2_1 = this.a2_2 = (1 - alpha) * norm;
    } else {
      // 18dB Highpass (3 biquads in series)
      this.b0_1 = this.b0_2 = this.b0_3 = (1 + cos) * 0.5 * norm;
      this.b1_1 = this.b1_2 = this.b1_3 = -(1 + cos) * norm;
      this.b2_1 = this.b2_2 = this.b2_3 = (1 + cos) * 0.5 * norm;
      this.a1_1 = this.a1_2 = this.a1_3 = -2 * cos * norm;
      this.a2_1 = this.a2_2 = this.a2_3 = (1 - alpha) * norm;
    }
  }

  processSample(input, cutoffFreq, resonance, sampleRate, filterType = 0) {
    this.updateCoefficients(cutoffFreq, resonance, sampleRate, filterType);

    // First biquad
    const y1 =
      this.b0_1 * input +
      this.b1_1 * this.x1_1 +
      this.b2_1 * this.x2_1 -
      this.a1_1 * this.y1_1 -
      this.a2_1 * this.y2_1;

    this.x2_1 = this.x1_1;
    this.x1_1 = input;
    this.y2_1 = this.y1_1;
    this.y1_1 = y1;

    // Second biquad
    const y2 =
      this.b0_2 * y1 +
      this.b1_2 * this.x1_2 +
      this.b2_2 * this.x2_2 -
      this.a1_2 * this.y1_2 -
      this.a2_2 * this.y2_2;

    this.x2_2 = this.x1_2;
    this.x1_2 = y1;
    this.y2_2 = this.y1_2;
    this.y1_2 = y2;

    // For 18dB highpass, add third biquad stage
    if (filterType === 1) {
      const y3 =
        this.b0_3 * y2 +
        this.b1_3 * this.x1_3 +
        this.b2_3 * this.x2_3 -
        this.a1_3 * this.y1_3 -
        this.a2_3 * this.y2_3;

      this.x2_3 = this.x1_3;
      this.x1_3 = y2;
      this.y2_3 = this.y1_3;
      this.y1_3 = y3;

      return y3;
    }

    return y2;
  }
}

// ============================================
// 3. OSCILLATORS
// ============================================

/**
 * PWM (Pulse Width Modulation) Oscillator
 * Generates bandlimited pulse wave with variable duty cycle
 */
class PWMOscillator {
  constructor() {
    this.phase = 0.0;
    this.pwmLfoPhase = Math.random();
  }

  /**
   * Generate next sample
   * @param {number} frequency - Oscillator frequency in Hz
   * @param {number} pulseWidth - Duty cycle (0.01-0.99)
   * @param {number} pwmDepth - PWM modulation depth (0-1)
   * @param {number} pwmRate - PWM LFO rate in Hz
   * @param {number} sampleRate - Audio sample rate
   * @returns {number} - Bandlimited pulse wave sample
   */
  process(frequency, pulseWidth, pwmDepth, pwmRate, sampleRate) {
    const phInc = frequency / sampleRate;

    // Update PWM LFO
    this.pwmLfoPhase += pwmRate / sampleRate;
    if (this.pwmLfoPhase >= 1) this.pwmLfoPhase -= 1;

    const pwmMod = Math.sin(2 * Math.PI * this.pwmLfoPhase);
    let duty = pulseWidth + pwmMod * (0.45 * pwmDepth);
    duty = Math.max(0.01, Math.min(0.99, duty));

    // Generate naive pulse
    let pulse = this.phase < duty ? 1.0 : -1.0;

    // Apply PolyBLEP anti-aliasing
    pulse -= PolyBLEP.residual(this.phase, phInc);
    pulse += PolyBLEP.residual((this.phase - duty + 1.0) % 1.0, phInc);

    // Advance phase
    this.phase += phInc;
    if (this.phase >= 1) this.phase -= 1;

    return pulse;
  }

  /**
   * Generate sub-oscillator (square wave, one octave down)
   */
  processSub(frequency, sampleRate) {
    const subFreq = frequency * 0.5;
    const subPhInc = subFreq / sampleRate;

    // We'll use a separate phase for sub
    if (!this.subPhase) this.subPhase = Math.random();

    let subSquare = this.subPhase < 0.5 ? 1.0 : -1.0;
    subSquare -= PolyBLEP.residual(this.subPhase, subPhInc);
    subSquare += PolyBLEP.residual((this.subPhase - 0.5 + 1.0) % 1.0, subPhInc);

    this.subPhase += subPhInc;
    if (this.subPhase >= 1) this.subPhase -= 1;

    return subSquare;
  }

  reset() {
    this.phase = 0.0;
  }
}

/**
 * Multi-waveform oscillator (Saw, Triangle, Sine, Square)
 */
class WaveformOscillator {
  constructor() {
    this.phase = Math.random();
    this.subPhase = Math.random();
  }

  /**
   * Generate waveform sample
   * @param {number} frequency - Frequency in Hz
   * @param {number} waveform - 0=Saw, 1=Triangle, 2=Sine, 3=Square
   * @param {number} sampleRate - Audio sample rate
   * @returns {number} - Waveform sample
   */
  process(frequency, waveform, sampleRate) {
    const phInc = frequency / sampleRate;

    let output = 0.0;

    switch (waveform) {
      case 0: // Saw
        output = 2.0 * this.phase - 1.0;
        output -= PolyBLEP.residual(this.phase, phInc);
        break;

      case 1: // Triangle
        output =
          this.phase < 0.5 ? 4.0 * this.phase - 1.0 : 3.0 - 4.0 * this.phase;
        break;

      case 2: // Sine
        output = Math.sin(2 * Math.PI * this.phase);
        break;

      case 3: // Square
        output = this.phase < 0.5 ? 1.0 : -1.0;
        output -= PolyBLEP.residual(this.phase, phInc);
        output += PolyBLEP.residual((this.phase - 0.5 + 1.0) % 1.0, phInc);
        break;
    }

    // Advance phase
    this.phase += phInc;
    if (this.phase >= 1) this.phase -= 1;

    return output;
  }

  /**
   * Generate sub-oscillator (one octave down, same waveform)
   */
  processSub(frequency, waveform, sampleRate) {
    const subFreq = frequency * 0.5;
    const subPhInc = subFreq / sampleRate;

    let output = 0.0;

    switch (waveform) {
      case 0: // Saw
        output = 2.0 * this.subPhase - 1.0;
        output -= PolyBLEP.residual(this.subPhase, subPhInc);
        break;

      case 1: // Triangle
        output =
          this.subPhase < 0.5
            ? 4.0 * this.subPhase - 1.0
            : 3.0 - 4.0 * this.subPhase;
        break;

      case 2: // Sine
        output = Math.sin(2 * Math.PI * this.subPhase);
        break;

      case 3: // Square
        output = this.subPhase < 0.5 ? 1.0 : -1.0;
        output -= PolyBLEP.residual(this.subPhase, subPhInc);
        output += PolyBLEP.residual(
          (this.subPhase - 0.5 + 1.0) % 1.0,
          subPhInc
        );
        break;
    }

    this.subPhase += subPhInc;
    if (this.subPhase >= 1) this.subPhase -= 1;

    return output;
  }

  reset() {
    this.phase = 0.0;
  }
}

// ============================================
// 4. ENVELOPE GENERATOR
// ============================================

/**
 * ADSR Envelope Generator with exponential curves
 */
class ADSREnvelope {
  constructor() {
    this.value = 0.0;
    this.state = 'idle';
    this.sustainLevel = 0.7;
    this.gate = false;
  }

  /**
   * Trigger attack phase
   */
  noteOn() {
    this.gate = true;
    this.state = 'attack';
  }

  /**
   * Trigger release phase
   */
  noteOff() {
    this.gate = false;
    this.state = 'release';
  }

  /**
   * Process one sample
   * @param {number} attack - Attack time in seconds
   * @param {number} decay - Decay time in seconds
   * @param {number} sustain - Sustain level (0-1)
   * @param {number} release - Release time in seconds
   * @param {number} sampleRate - Audio sample rate
   * @returns {number} - Current envelope value
   */
  process(attack, decay, sustain, release, sampleRate) {
    const envFloor = 0.0001;

    switch (this.state) {
      case 'attack':
        if (attack <= 0) {
          this.value = 1.0;
          this.state = 'decay';
        } else {
          const attackCoeff = 1.0 - Math.exp(-1.0 / (attack * sampleRate));
          this.value += (1.0 - this.value) * attackCoeff;
          if (this.value >= 0.9999) {
            this.value = 1.0;
            this.state = 'decay';
          }
        }
        break;

      case 'decay':
        this.sustainLevel = Math.max(envFloor, sustain);
        if (decay <= 0) {
          this.value = this.sustainLevel;
          this.state = this.gate ? 'sustain' : 'release';
        } else {
          const decayCoeff = 1.0 - Math.exp(-1.0 / (decay * sampleRate));
          this.value += (this.sustainLevel - this.value) * decayCoeff;
          if (Math.abs(this.value - this.sustainLevel) < 0.0001) {
            this.value = this.sustainLevel;
            this.state = this.gate ? 'sustain' : 'release';
          }
        }
        break;

      case 'sustain':
        this.sustainLevel = Math.max(envFloor, sustain);
        this.value = this.sustainLevel;
        if (!this.gate) this.state = 'release';
        break;

      case 'release':
        if (release <= 0) {
          this.value = 0.0;
          this.state = 'idle';
        } else {
          const releaseCoeff = 1.0 - Math.exp(-1.0 / (release * sampleRate));
          this.value += (envFloor - this.value) * releaseCoeff;
          if (this.value <= envFloor * 1.5) {
            this.value = 0.0;
            this.state = 'idle';
          }
        }
        break;

      case 'idle':
        this.value = 0.0;
        break;
    }

    return this.value;
  }

  isActive() {
    return this.state !== 'idle';
  }

  reset() {
    this.value = 0.0;
    this.state = 'idle';
    this.gate = false;
  }
}

// ============================================
// 5. MODULATION MATRIX
// ============================================

/**
 * Aftertouch modulation matrix with 4 destinations
 */
class ModulationMatrix {
  /**
   * Apply aftertouch modulation to parameters
   * @param {number} aftertouchValue - Aftertouch value (0-1)
   * @param {Object} params - Synth parameters
   * @returns {Object} - Modulation amounts for each destination
   */
  static applyAftertouch(aftertouchValue, params) {
    const mods = {
      osc1Pitch: 0,
      osc1Volume: 0,
      sub1Volume: 0,
      osc1PW: 0,
      pwmRate: 0,
      fmDepth: 0,
      osc2Pitch: 0,
      osc2Volume: 0,
      sub2Volume: 0,
      ringVolume: 0,
      noiseMix: 0,
      lpCutoff: 0,
      lpResonance: 0,
      hpCutoff: 0,
      hpResonance: 0,
      panDepth: 0,
      panRate: 0,
    };

    // Destinations: 0=none, 1=osc1Pitch, 2=osc1Volume, 3=sub1Volume, 4=osc1PW,
    // 5=pwmRate, 6=fmDepth, 7=osc2Pitch, 8=osc2Volume, 9=sub2Volume, 10=ringVolume,
    // 11=noiseMix, 12=lpCutoff, 13=lpResonance, 14=hpCutoff, 15=hpResonance, 16=panDepth, 17=panRate

    for (let slot = 1; slot <= 4; slot++) {
      const dest = params[`aftertouchDest${slot}`];
      const amount = params[`aftertouchAmount${slot}`];

      if (dest === 1) mods.osc1Pitch += aftertouchValue * amount;
      else if (dest === 2) mods.osc1Volume += aftertouchValue * amount;
      else if (dest === 3) mods.sub1Volume += aftertouchValue * amount;
      else if (dest === 4) mods.osc1PW += aftertouchValue * amount;
      else if (dest === 5) mods.pwmRate += aftertouchValue * amount;
      else if (dest === 6) mods.fmDepth += aftertouchValue * amount;
      else if (dest === 7) mods.osc2Pitch += aftertouchValue * amount;
      else if (dest === 8) mods.osc2Volume += aftertouchValue * amount;
      else if (dest === 9) mods.sub2Volume += aftertouchValue * amount;
      else if (dest === 10) mods.ringVolume += aftertouchValue * amount;
      else if (dest === 11) mods.noiseMix += aftertouchValue * amount;
      else if (dest === 12) mods.lpCutoff += aftertouchValue * amount;
      else if (dest === 13) mods.lpResonance += aftertouchValue * amount;
      else if (dest === 14) mods.hpCutoff += aftertouchValue * amount;
      else if (dest === 15) mods.hpResonance += aftertouchValue * amount;
      else if (dest === 16) mods.panDepth += aftertouchValue * amount;
      else if (dest === 17) mods.panRate += aftertouchValue * amount;
    }

    return mods;
  }
}

// ============================================
// 6. VOICE
// ============================================

/**
 * Single synthesizer voice with all oscillators, filters, and envelope
 */
class Voice {
  constructor() {
    this.osc1 = new PWMOscillator();
    this.osc2 = new WaveformOscillator();
    this.envelope = new ADSREnvelope();
    this.lpf = new IIRFilter();
    this.hpf = new IIRFilter();

    this.panLfoPhase = Math.random();

    this.midi = -1;
    this.velocity = 1.0;
    this.active = false;
  }

  /**
   * Trigger note on
   */
  noteOn(midiNote, velocity) {
    this.midi = midiNote;
    this.velocity = velocity;
    this.active = true;
    this.envelope.noteOn();
  }

  /**
   * Trigger note off
   */
  noteOff() {
    this.envelope.noteOff();
  }

  /**
   * Convert MIDI note to frequency
   */
  midiToHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  /**
   * Process one sample
   * @param {Object} params - Synth parameters
   * @param {Object} aftertouchMods - Aftertouch modulation amounts
   * @param {number} noiseSample - Global noise sample (or 0 if noiseVol = 0)
   * @param {number} sampleRate - Audio sample rate
   * @returns {Object} - {left, right} stereo output
   */
  process(params, aftertouchMods, noiseSample, sampleRate) {
    if (!this.active) return { left: 0, right: 0 };

    // Get base frequency with pitch modulation
    const baseSemi =
      this.midi +
      params.coarse +
      params.fine / 100.0 +
      params.pitchBend +
      aftertouchMods.osc1Pitch * 12;
    const baseFreq = this.midiToHz(baseSemi);

    // Oscillator 2 frequency
    const osc2Semi =
      this.midi +
      params.osc2Coarse +
      params.osc2Fine / 100.0 +
      aftertouchMods.osc2Pitch * 12;
    const osc2Freq = this.midiToHz(osc2Semi);

    // Generate Osc2 for FM modulation
    const osc2Raw = this.osc2.process(
      osc2Freq,
      params.osc2Waveform,
      sampleRate
    );

    // Apply FM modulation to Osc1 frequency
    let fmDepth = Math.max(
      0,
      Math.min(1, params.fmDepth + aftertouchMods.fmDepth)
    );
    const fmModulation = osc2Raw * fmDepth * baseFreq * 0.5;
    const modulatedFreq = baseFreq + fmModulation;

    // Hard sync: reset Osc2 phase when Osc1 wraps
    const prevOsc1Phase = this.osc1.phase;

    // Generate Osc1 PWM
    let pulseWidth = Math.max(
      0.01,
      Math.min(0.99, params.pulseWidth + aftertouchMods.osc1PW * 0.4)
    );
    let pwmRate = Math.max(
      0.1,
      Math.min(10, params.pwmRate + aftertouchMods.pwmRate * 5)
    );
    const osc1Raw = this.osc1.process(
      modulatedFreq,
      pulseWidth,
      params.pwmDepth,
      pwmRate,
      sampleRate
    );

    // Apply hard sync
    if (params.hardSync > 0 && prevOsc1Phase > this.osc1.phase) {
      this.osc2.phase = 0.0;
    }

    // Sub oscillators
    let subVol = Math.max(
      0,
      Math.min(1, params.subVol + aftertouchMods.sub1Volume)
    );
    const subOsc =
      subVol > 0 ? this.osc1.processSub(baseFreq, sampleRate) * subVol : 0;

    let sub2Vol = Math.max(
      0,
      Math.min(1, params.sub2Vol + aftertouchMods.sub2Volume)
    );
    const sub2Osc =
      sub2Vol > 0
        ? this.osc2.processSub(osc2Freq, params.osc2Waveform, sampleRate) *
          sub2Vol
        : 0;

    // Apply oscillator volumes
    let oscVol = Math.max(
      0,
      Math.min(1, params.oscVol + aftertouchMods.osc1Volume)
    );
    let osc2Vol = Math.max(
      0,
      Math.min(1, params.osc2Vol + aftertouchMods.osc2Volume)
    );

    const osc1Output = osc1Raw * oscVol + subOsc;
    const osc2Output = osc2Raw * osc2Vol;

    // Ring modulator
    let ringVol = Math.max(
      0,
      Math.min(1, params.ringVol + aftertouchMods.ringVolume)
    );
    const ringOutput = ringVol > 0 ? osc1Raw * osc2Raw * ringVol : 0;

    // Mix oscillators and add noise
    let signal = osc1Output + osc2Output + sub2Osc + ringOutput + noiseSample;

    // Apply filters (HPF -> LPF in series)
    let hpfCutoff = Math.max(
      20,
      Math.min(20000, params.hpfCutoff + aftertouchMods.hpCutoff * 5000)
    );
    let hpfResonance = Math.max(
      0,
      Math.min(0.95, params.hpfResonance + aftertouchMods.hpResonance * 0.5)
    );
    signal = this.hpf.processSample(
      signal,
      hpfCutoff,
      hpfResonance,
      sampleRate,
      1
    );

    let lpfCutoff = Math.max(
      20,
      Math.min(20000, params.lpfCutoff + aftertouchMods.lpCutoff * 5000)
    );
    let lpfResonance = Math.max(
      0,
      Math.min(0.95, params.lpfResonance + aftertouchMods.lpResonance * 0.5)
    );
    signal = this.lpf.processSample(
      signal,
      lpfCutoff,
      lpfResonance,
      sampleRate,
      0
    );

    // Apply envelope
    const envValue = this.envelope.process(
      params.envA,
      params.envD,
      params.envS,
      params.envR,
      sampleRate
    );

    // Check if voice should be deactivated
    if (!this.envelope.isActive()) {
      this.active = false;
    }

    // Auto-pan with LFO
    let panRate = Math.max(
      0.1,
      Math.min(10, params.panRate + aftertouchMods.panRate * 5)
    );
    let panDepth = Math.max(
      0,
      Math.min(1, params.panDepth + aftertouchMods.panDepth)
    );

    this.panLfoPhase += panRate / sampleRate;
    if (this.panLfoPhase >= 1) this.panLfoPhase -= 1;

    const panMod = Math.sin(2 * Math.PI * this.panLfoPhase) * panDepth;
    const pan = Math.max(-1, Math.min(1, params.panPos + panMod));

    // Equal-power panning
    const lg = Math.sqrt(0.5 * (1 - pan));
    const rg = Math.sqrt(0.5 * (1 + pan));

    // Apply velocity and master volume
    const effectiveVelocity =
      1.0 - params.velocityAmt + this.velocity * params.velocityAmt;
    const output = signal * envValue * effectiveVelocity * params.master * 0.2;

    return {
      left: output * lg,
      right: output * rg,
    };
  }

  isActive() {
    return this.active;
  }
}

// ============================================
// 7. MAIN PROCESSOR
// ============================================

class PolyPWMSynthProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'oscillatorCoarseTune',
        defaultValue: 0,
        minValue: -48,
        maxValue: 48,
        automationRate: 'k-rate',
      },
      {
        name: 'oscillatorFineTune',
        defaultValue: 0,
        minValue: -50,
        maxValue: 50,
        automationRate: 'k-rate',
      },
      {
        name: 'pitchBend',
        defaultValue: 0,
        minValue: -24,
        maxValue: 24,
        automationRate: 'a-rate',
      },
      {
        name: 'pitchBendRange',
        defaultValue: 2,
        minValue: 0,
        maxValue: 24,
        automationRate: 'k-rate',
      },
      {
        name: 'oscillatorVolume',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'pulseWidth',
        defaultValue: 0.5,
        minValue: 0.01,
        maxValue: 0.99,
        automationRate: 'a-rate',
      },
      {
        name: 'pulseWidthModulationDepth',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate',
      },
      {
        name: 'pulseWidthModulationRate',
        defaultValue: 2.0,
        minValue: 0.1,
        maxValue: 10,
        automationRate: 'a-rate',
      },
      {
        name: 'panningPosition',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'panningModulationDepth',
        defaultValue: 0.5,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'panningModulationRate',
        defaultValue: 0.5,
        minValue: 0.1,
        maxValue: 10,
        automationRate: 'a-rate',
      },
      {
        name: 'envelopeAttack',
        defaultValue: 0.005,
        minValue: 0.0,
        maxValue: 2.0,
        automationRate: 'k-rate',
      },
      {
        name: 'envelopeDecay',
        defaultValue: 0.1,
        minValue: 0.0,
        maxValue: 2.0,
        automationRate: 'k-rate',
      },
      {
        name: 'envelopeSustain',
        defaultValue: 0.7,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'envelopeRelease',
        defaultValue: 0.2,
        minValue: 0.0,
        maxValue: 3.0,
        automationRate: 'k-rate',
      },
      {
        name: 'subOscillatorVolume',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'frequencyModulationDepth',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'oscillator2Waveform',
        defaultValue: 0,
        minValue: 0,
        maxValue: 3,
        automationRate: 'k-rate',
      },
      {
        name: 'oscillator2CoarseTune',
        defaultValue: 0,
        minValue: -48,
        maxValue: 48,
        automationRate: 'k-rate',
      },
      {
        name: 'oscillator2FineTune',
        defaultValue: 0,
        minValue: -50,
        maxValue: 50,
        automationRate: 'k-rate',
      },
      {
        name: 'oscillator2Volume',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'subOscillator2Volume',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'oscillator2HardSync',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
      {
        name: 'ringModulatorVolume',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'noiseVolume',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'masterVolume',
        defaultValue: 0.4,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
      {
        name: 'velocityAmount',
        defaultValue: 0.5,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchDest1',
        defaultValue: 0,
        minValue: 0,
        maxValue: 17,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchAmount1',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchDest2',
        defaultValue: 0,
        minValue: 0,
        maxValue: 17,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchAmount2',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchDest3',
        defaultValue: 0,
        minValue: 0,
        maxValue: 17,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchAmount3',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchDest4',
        defaultValue: 0,
        minValue: 0,
        maxValue: 17,
        automationRate: 'k-rate',
      },
      {
        name: 'aftertouchAmount4',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'filterCutoff',
        defaultValue: 5000,
        minValue: 20,
        maxValue: 20000,
        automationRate: 'a-rate',
      },
      {
        name: 'filterResonance',
        defaultValue: 0.1,
        minValue: 0.0,
        maxValue: 0.95,
        automationRate: 'a-rate',
      },
      {
        name: 'hpfCutoff',
        defaultValue: 20,
        minValue: 20,
        maxValue: 20000,
        automationRate: 'a-rate',
      },
      {
        name: 'hpfResonance',
        defaultValue: 0.1,
        minValue: 0.0,
        maxValue: 0.95,
        automationRate: 'a-rate',
      },
    ];
  }

  constructor() {
    super();
    this.sampleRate = sampleRate;
    this.aftertouch = 0.0;
    this.noiseGen = new NoiseGenerator();

    // Voice pool (8 voices)
    this.maxVoices = 8;
    this.voices = [];
    this.noteToVoice = new Map();

    for (let i = 0; i < this.maxVoices; i++) {
      this.voices.push(new Voice());
    }

    // Handle MIDI messages
    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'noteOn') {
        this.noteOn(msg.midi | 0, Math.max(0, Math.min(1, +msg.velocity)));
      } else if (msg.type === 'noteOff') {
        this.noteOff(msg.midi | 0);
      } else if (msg.type === 'aftertouch') {
        this.aftertouch = Math.max(0, Math.min(1, +msg.value / 127.0));
      }
    };
  }

  allocateVoice(midi) {
    // Find free voice
    for (let i = 0; i < this.maxVoices; i++) {
      if (!this.voices[i].active) {
        return i;
      }
    }

    // Steal voice in release
    for (let i = 0; i < this.maxVoices; i++) {
      if (
        this.voices[i].envelope.state === 'release' ||
        this.voices[i].envelope.state === 'idle'
      ) {
        if (this.voices[i].midi >= 0) {
          this.noteToVoice.delete(this.voices[i].midi);
        }
        return i;
      }
    }

    // Steal oldest voice
    if (this.voices[0].midi >= 0) {
      this.noteToVoice.delete(this.voices[0].midi);
    }
    return 0;
  }

  noteOn(midi, velocity) {
    // Retrigger if already playing
    if (this.noteToVoice.has(midi)) {
      const voiceIndex = this.noteToVoice.get(midi);
      this.voices[voiceIndex].noteOn(midi, velocity);
      return;
    }

    // Allocate new voice
    const voiceIndex = this.allocateVoice(midi);
    this.voices[voiceIndex].noteOn(midi, velocity);
    this.noteToVoice.set(midi, voiceIndex);
  }

  noteOff(midi) {
    if (this.noteToVoice.has(midi)) {
      const voiceIndex = this.noteToVoice.get(midi);
      this.voices[voiceIndex].noteOff();
      this.noteToVoice.delete(midi);
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const L = output[0];
    const R = output[1];

    if (!L || !R) return true;

    // Build parameter object for voices
    const params = {
      coarse: parameters.oscillatorCoarseTune[0],
      fine: parameters.oscillatorFineTune[0],
      pitchBend:
        parameters.pitchBend.length > 1
          ? parameters.pitchBend
          : parameters.pitchBend[0],
      oscVol:
        parameters.oscillatorVolume.length > 1
          ? parameters.oscillatorVolume
          : parameters.oscillatorVolume[0],
      pulseWidth:
        parameters.pulseWidth.length > 1
          ? parameters.pulseWidth
          : parameters.pulseWidth[0],
      pwmDepth:
        parameters.pulseWidthModulationDepth.length > 1
          ? parameters.pulseWidthModulationDepth
          : parameters.pulseWidthModulationDepth[0],
      pwmRate:
        parameters.pulseWidthModulationRate.length > 1
          ? parameters.pulseWidthModulationRate
          : parameters.pulseWidthModulationRate[0],
      panPos:
        parameters.panningPosition.length > 1
          ? parameters.panningPosition
          : parameters.panningPosition[0],
      panDepth:
        parameters.panningModulationDepth.length > 1
          ? parameters.panningModulationDepth
          : parameters.panningModulationDepth[0],
      panRate:
        parameters.panningModulationRate.length > 1
          ? parameters.panningModulationRate
          : parameters.panningModulationRate[0],
      envA: parameters.envelopeAttack[0],
      envD: parameters.envelopeDecay[0],
      envS: parameters.envelopeSustain[0],
      envR: parameters.envelopeRelease[0],
      subVol:
        parameters.subOscillatorVolume.length > 1
          ? parameters.subOscillatorVolume
          : parameters.subOscillatorVolume[0],
      fmDepth:
        parameters.frequencyModulationDepth.length > 1
          ? parameters.frequencyModulationDepth
          : parameters.frequencyModulationDepth[0],
      osc2Waveform: parameters.oscillator2Waveform[0],
      osc2Coarse: parameters.oscillator2CoarseTune[0],
      osc2Fine: parameters.oscillator2FineTune[0],
      osc2Vol:
        parameters.oscillator2Volume.length > 1
          ? parameters.oscillator2Volume
          : parameters.oscillator2Volume[0],
      sub2Vol:
        parameters.subOscillator2Volume.length > 1
          ? parameters.subOscillator2Volume
          : parameters.subOscillator2Volume[0],
      hardSync: parameters.oscillator2HardSync[0],
      ringVol:
        parameters.ringModulatorVolume.length > 1
          ? parameters.ringModulatorVolume
          : parameters.ringModulatorVolume[0],
      noiseVol:
        parameters.noiseVolume.length > 1
          ? parameters.noiseVolume
          : parameters.noiseVolume[0],
      master:
        parameters.masterVolume.length > 1
          ? parameters.masterVolume
          : parameters.masterVolume[0],
      velocityAmt: parameters.velocityAmount[0],
      lpfCutoff:
        parameters.filterCutoff.length > 1
          ? parameters.filterCutoff
          : parameters.filterCutoff[0],
      lpfResonance:
        parameters.filterResonance.length > 1
          ? parameters.filterResonance
          : parameters.filterResonance[0],
      hpfCutoff:
        parameters.hpfCutoff.length > 1
          ? parameters.hpfCutoff
          : parameters.hpfCutoff[0],
      hpfResonance:
        parameters.hpfResonance.length > 1
          ? parameters.hpfResonance
          : parameters.hpfResonance[0],
      aftertouchDest1: parameters.aftertouchDest1[0],
      aftertouchAmount1: parameters.aftertouchAmount1[0],
      aftertouchDest2: parameters.aftertouchDest2[0],
      aftertouchAmount2: parameters.aftertouchAmount2[0],
      aftertouchDest3: parameters.aftertouchDest3[0],
      aftertouchAmount3: parameters.aftertouchAmount3[0],
      aftertouchDest4: parameters.aftertouchDest4[0],
      aftertouchAmount4: parameters.aftertouchAmount4[0],
    };

    // Apply aftertouch modulation
    const aftertouchMods = ModulationMatrix.applyAftertouch(
      this.aftertouch,
      params
    );

    // Clear output
    for (let i = 0; i < L.length; i++) {
      L[i] = 0;
      R[i] = 0;
    }

    // Process each voice
    for (let voiceIndex = 0; voiceIndex < this.maxVoices; voiceIndex++) {
      const voice = this.voices[voiceIndex];

      for (let i = 0; i < L.length; i++) {
        // Extract sample-rate params for this sample
        const sampleParams = {
          ...params,
          pitchBend: Array.isArray(params.pitchBend)
            ? params.pitchBend[i]
            : params.pitchBend,
          oscVol: Array.isArray(params.oscVol)
            ? params.oscVol[i]
            : params.oscVol,
          pulseWidth: Array.isArray(params.pulseWidth)
            ? params.pulseWidth[i]
            : params.pulseWidth,
          pwmDepth: Array.isArray(params.pwmDepth)
            ? params.pwmDepth[i]
            : params.pwmDepth,
          pwmRate: Array.isArray(params.pwmRate)
            ? params.pwmRate[i]
            : params.pwmRate,
          panPos: Array.isArray(params.panPos)
            ? params.panPos[i]
            : params.panPos,
          panDepth: Array.isArray(params.panDepth)
            ? params.panDepth[i]
            : params.panDepth,
          panRate: Array.isArray(params.panRate)
            ? params.panRate[i]
            : params.panRate,
          subVol: Array.isArray(params.subVol)
            ? params.subVol[i]
            : params.subVol,
          fmDepth: Array.isArray(params.fmDepth)
            ? params.fmDepth[i]
            : params.fmDepth,
          osc2Vol: Array.isArray(params.osc2Vol)
            ? params.osc2Vol[i]
            : params.osc2Vol,
          sub2Vol: Array.isArray(params.sub2Vol)
            ? params.sub2Vol[i]
            : params.sub2Vol,
          ringVol: Array.isArray(params.ringVol)
            ? params.ringVol[i]
            : params.ringVol,
          noiseVol: Array.isArray(params.noiseVol)
            ? params.noiseVol[i]
            : params.noiseVol,
          master: Array.isArray(params.master)
            ? params.master[i]
            : params.master,
          lpfCutoff: Array.isArray(params.lpfCutoff)
            ? params.lpfCutoff[i]
            : params.lpfCutoff,
          lpfResonance: Array.isArray(params.lpfResonance)
            ? params.lpfResonance[i]
            : params.lpfResonance,
          hpfCutoff: Array.isArray(params.hpfCutoff)
            ? params.hpfCutoff[i]
            : params.hpfCutoff,
          hpfResonance: Array.isArray(params.hpfResonance)
            ? params.hpfResonance[i]
            : params.hpfResonance,
        };

        // Generate global noise sample once per sample
        const noiseVol = sampleParams.noiseVol;
        const noiseSample = noiseVol > 0 ? this.noiseGen.next() * noiseVol : 0;

        const voiceOutput = voice.process(
          sampleParams,
          aftertouchMods,
          noiseSample,
          this.sampleRate
        );

        L[i] += voiceOutput.left;
        R[i] += voiceOutput.right;
      }
    }

    return true;
  }
}

registerProcessor('mono-pwm-synth', PolyPWMSynthProcessor);
