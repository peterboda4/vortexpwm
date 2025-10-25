// worklet/synth-processor.js - Polyphonic PWM synth with stereo path, autopan, ADSR, master
// Note: run from a secure context (https or localhost).

// IIR Filter class (24dB resonant lowpass)
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
      // Aftertouch modulation slots (4 destinations)
      // Destination: 0=none, 1=osc1Pitch, 2=osc1Volume, 3=sub1Volume, 4=osc1PW,
      // 5=pwmRate, 6=fmDepth, 7=osc2Pitch, 8=osc2Volume, 9=sub2Volume, 10=ringVolume,
      // 11=noiseMix, 12=lpCutoff, 13=lpResonance, 14=hpCutoff, 15=hpResonance, 16=panDepth, 17=panRate
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
      {
        name: 'filterEnvAttack',
        defaultValue: 0.005,
        minValue: 0.0,
        maxValue: 2.0,
        automationRate: 'k-rate',
      },
      {
        name: 'filterEnvDecay',
        defaultValue: 0.1,
        minValue: 0.0,
        maxValue: 2.0,
        automationRate: 'k-rate',
      },
      {
        name: 'filterEnvSustain',
        defaultValue: 0.7,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'filterEnvRelease',
        defaultValue: 0.2,
        minValue: 0.0,
        maxValue: 3.0,
        automationRate: 'k-rate',
      },
      {
        name: 'lpEnvAmount',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
      {
        name: 'hpEnvAmount',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    this.sampleRate = sampleRate;

    // Aftertouch state (channel pressure, 0.0 to 1.0)
    this.aftertouch = 0.0;

    // Global white noise generator state (monophonic)
    this.noiseState = Math.random() * 4294967296; // 32-bit seed

    // Voice pool (8 voices max)
    this.maxVoices = 8;
    this.voices = [];
    this.noteToVoice = new Map(); // midi note -> voice index

    // Initialize voice pool
    for (let i = 0; i < this.maxVoices; i++) {
      this.voices.push({
        // Oscillator 1 state
        phase: 0.0,
        pwmLfoPhase: Math.random(),
        subPhase: Math.random(),
        panLfoPhase: Math.random(),

        // Oscillator 2 state
        osc2Phase: Math.random(),
        sub2Phase: Math.random(),

        // Amp Envelope
        env: 0.0,
        envState: 'idle',
        sustainLevel: 0.7,

        // Filter Envelope
        filterEnv: 0.0,
        filterEnvState: 'idle',
        filterSustainLevel: 0.7,

        // Filters (LPF + HPF in series)
        lpf: new IIRFilter(),
        hpf: new IIRFilter(),

        // Voice data
        midi: -1,
        velocity: 1.0,
        gate: false,
        active: false,
      });
    }

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'noteOn') {
        this.noteOn(msg.midi | 0, Math.max(0, Math.min(1, +msg.velocity)));
      } else if (msg.type === 'noteOff') {
        this.noteOff(msg.midi | 0);
      } else if (msg.type === 'aftertouch') {
        // Channel pressure (aftertouch), value 0-127 normalized to 0.0-1.0
        this.aftertouch = Math.max(0, Math.min(1, +msg.value / 127.0));
      }
    };
  }

  // Find a free voice or steal oldest voice
  allocateVoice(midi) {
    // First try to find a free voice
    for (let i = 0; i < this.maxVoices; i++) {
      if (!this.voices[i].active) {
        return i;
      }
    }

    // No free voices, steal the oldest (first active voice in release)
    for (let i = 0; i < this.maxVoices; i++) {
      if (
        this.voices[i].envState === 'release' ||
        this.voices[i].envState === 'idle'
      ) {
        // Remove old note mapping
        if (this.voices[i].midi >= 0) {
          this.noteToVoice.delete(this.voices[i].midi);
        }
        return i;
      }
    }

    // All voices active, steal voice 0
    if (this.voices[0].midi >= 0) {
      this.noteToVoice.delete(this.voices[0].midi);
    }
    return 0;
  }

  noteOn(midi, velocity) {
    // If note is already playing, retrigger it
    if (this.noteToVoice.has(midi)) {
      const voiceIndex = this.noteToVoice.get(midi);
      const voice = this.voices[voiceIndex];
      voice.velocity = velocity;
      voice.gate = true;
      voice.envState = 'attack';
      voice.filterEnvState = 'attack';
      return;
    }

    // Allocate new voice
    const voiceIndex = this.allocateVoice(midi);
    const voice = this.voices[voiceIndex];

    voice.midi = midi;
    voice.velocity = velocity;
    voice.gate = true;
    voice.active = true;
    voice.envState = 'attack';
    voice.filterEnvState = 'attack';

    this.noteToVoice.set(midi, voiceIndex);
  }

  noteOff(midi) {
    if (this.noteToVoice.has(midi)) {
      const voiceIndex = this.noteToVoice.get(midi);
      const voice = this.voices[voiceIndex];
      voice.gate = false;
      voice.envState = 'release';
      voice.filterEnvState = 'release';
    }
  }

  midiToHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  // Global white noise generator using linear congruential generator (LCG)
  // Returns a value in the range [-1, 1]
  generateNoise() {
    // LCG parameters (Numerical Recipes)
    this.noiseState = (this.noiseState * 1664525 + 1013904223) >>> 0;
    // Convert to [-1, 1] range
    return this.noiseState / 2147483648.0 - 1.0;
  }

  // PolyBLEP anti-aliasing residual for bandlimited pulse wave
  // t = phase position relative to discontinuity (normalized to ±1)
  // dt = phase increment per sample
  polyBLEP(t, dt) {
    // If t is near a discontinuity (within one sample), apply correction
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

  // Generate waveforms for Oscillator 2
  // waveform: 0=Saw, 1=Triangle, 2=Sine, 3=Square
  generateWaveform(phase, phInc, waveform) {
    switch (waveform) {
      case 0: // Saw
        let saw = 2.0 * phase - 1.0;
        saw -= this.polyBLEP(phase, phInc);
        return saw;

      case 1: // Triangle
        let tri = phase < 0.5 ? 4.0 * phase - 1.0 : 3.0 - 4.0 * phase;
        return tri;

      case 2: // Sine
        return Math.sin(2 * Math.PI * phase);

      case 3: // Square
        let square = phase < 0.5 ? 1.0 : -1.0;
        square -= this.polyBLEP(phase, phInc);
        square += this.polyBLEP((phase - 0.5 + 1.0) % 1.0, phInc);
        return square;

      default:
        return 0.0;
    }
  }

  processVoice(voice, params, sampleIndex) {
    if (!voice.active) return { left: 0, right: 0 };

    const sr = this.sampleRate;
    const twoPi = 2 * Math.PI;

    // Apply aftertouch modulation to parameters
    // Destinations: 0=none, 1=osc1Pitch, 2=osc1Volume, 3=sub1Volume, 4=osc1PW,
    // 5=pwmRate, 6=fmDepth, 7=osc2Pitch, 8=osc2Volume, 9=sub2Volume, 10=ringVolume,
    // 11=noiseMix, 12=lpCutoff, 13=lpResonance, 14=hpCutoff, 15=hpResonance, 16=panDepth, 17=panRate
    const aftertouchMods = {
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

    for (let slot = 1; slot <= 4; slot++) {
      const dest = params[`aftertouchDest${slot}`];
      const amount = params[`aftertouchAmount${slot}`];

      if (dest === 1) aftertouchMods.osc1Pitch += this.aftertouch * amount;
      else if (dest === 2)
        aftertouchMods.osc1Volume += this.aftertouch * amount;
      else if (dest === 3)
        aftertouchMods.sub1Volume += this.aftertouch * amount;
      else if (dest === 4) aftertouchMods.osc1PW += this.aftertouch * amount;
      else if (dest === 5) aftertouchMods.pwmRate += this.aftertouch * amount;
      else if (dest === 6) aftertouchMods.fmDepth += this.aftertouch * amount;
      else if (dest === 7) aftertouchMods.osc2Pitch += this.aftertouch * amount;
      else if (dest === 8)
        aftertouchMods.osc2Volume += this.aftertouch * amount;
      else if (dest === 9)
        aftertouchMods.sub2Volume += this.aftertouch * amount;
      else if (dest === 10)
        aftertouchMods.ringVolume += this.aftertouch * amount;
      else if (dest === 11) aftertouchMods.noiseMix += this.aftertouch * amount;
      else if (dest === 12) aftertouchMods.lpCutoff += this.aftertouch * amount;
      else if (dest === 13)
        aftertouchMods.lpResonance += this.aftertouch * amount;
      else if (dest === 14) aftertouchMods.hpCutoff += this.aftertouch * amount;
      else if (dest === 15)
        aftertouchMods.hpResonance += this.aftertouch * amount;
      else if (dest === 16) aftertouchMods.panDepth += this.aftertouch * amount;
      else if (dest === 17) aftertouchMods.panRate += this.aftertouch * amount;
    }

    // Get FM parameters first
    let fmDepthNow =
      params.fmDepth.length > 1
        ? params.fmDepth[sampleIndex]
        : params.fmDepth[0];
    // Apply aftertouch modulation to FM depth and clamp to [0, 1]
    fmDepthNow = Math.max(0, Math.min(1, fmDepthNow + aftertouchMods.fmDepth));

    // Calculate Osc2 first for FM modulation
    const osc2WaveformNow = params.osc2Waveform;
    const osc2CoarseNow = params.osc2Coarse;
    const osc2FineNow = params.osc2Fine;
    const hardSyncNow = params.hardSync;

    // Oscillator 2 frequency calculation with aftertouch pitch modulation
    const osc2Semi =
      voice.midi +
      osc2CoarseNow +
      osc2FineNow / 100.0 +
      aftertouchMods.osc2Pitch * 12;
    const osc2Freq = this.midiToHz(osc2Semi);
    const osc2PhInc = osc2Freq / sr;

    // Advance Osc2 phase first
    voice.osc2Phase += osc2PhInc;
    if (voice.osc2Phase >= 1) voice.osc2Phase -= 1;

    // Generate Osc2 raw waveform for FM modulation
    const osc2Raw = this.generateWaveform(
      voice.osc2Phase,
      osc2PhInc,
      osc2WaveformNow
    );

    // Frequency with coarse semitone offset, fine tune (cents), and pitch bend
    const coarseNow =
      params.coarse.length > 1 ? params.coarse[sampleIndex] : params.coarse[0];
    const fineNow =
      params.fine.length > 1 ? params.fine[sampleIndex] : params.fine[0];
    const pitchBendNow =
      params.pitchBend.length > 1
        ? params.pitchBend[sampleIndex]
        : params.pitchBend[0];
    const baseSemi =
      voice.midi +
      coarseNow +
      fineNow / 100.0 +
      pitchBendNow +
      aftertouchMods.osc1Pitch * 12;
    const baseFreq = this.midiToHz(baseSemi);

    // Apply FM modulation: modulate frequency with Osc2 output
    const fmModulation = osc2Raw * fmDepthNow * baseFreq * 0.5; // Scale modulation amount
    const modulatedFreq = baseFreq + fmModulation;

    // Store previous Osc1 phase for hard sync detection
    const prevOsc1Phase = voice.phase;

    // Phase advance for Osc1 with FM
    const phInc = modulatedFreq / sr;
    voice.phase += phInc;
    if (voice.phase >= 1) voice.phase -= 1;

    // Apply hard sync: reset Osc2 phase when Osc1 phase wraps
    if (hardSyncNow > 0) {
      if (prevOsc1Phase > voice.phase) {
        // Phase wrapped from >1 to <1
        voice.osc2Phase = 0.0;
      }
    }

    // Sub oscillator (one octave down = half frequency)
    const subFreq = baseFreq * 0.5;
    const subPhInc = subFreq / sr;
    voice.subPhase += subPhInc;
    if (voice.subPhase >= 1) voice.subPhase -= 1;

    // PWM LFO
    let pwmRateNow =
      params.pwmRate.length > 1
        ? params.pwmRate[sampleIndex]
        : params.pwmRate[0];
    // Apply aftertouch modulation to PWM rate and clamp to [0.1, 10]
    pwmRateNow = Math.max(
      0.1,
      Math.min(10, pwmRateNow + aftertouchMods.pwmRate * 5)
    );

    let pulseWidthNow =
      params.pulseWidth.length > 1
        ? params.pulseWidth[sampleIndex]
        : params.pulseWidth[0];
    // Apply aftertouch modulation to pulse width and clamp to [0.01, 0.99]
    pulseWidthNow = Math.max(
      0.01,
      Math.min(0.99, pulseWidthNow + aftertouchMods.osc1PW * 0.4)
    );

    const pwmDepthNow =
      params.pwmDepth.length > 1
        ? params.pwmDepth[sampleIndex]
        : params.pwmDepth[0];

    voice.pwmLfoPhase += pwmRateNow / sr;
    if (voice.pwmLfoPhase >= 1) voice.pwmLfoPhase -= 1;

    const pwmMod = Math.sin(twoPi * voice.pwmLfoPhase);
    // Oscillate around pulseWidth (PW ± modulation)
    let duty = pulseWidthNow + pwmMod * (0.45 * pwmDepthNow);
    // Clamp to 1%-99% to avoid extreme values
    duty = Math.max(0.01, Math.min(0.99, duty));

    // Bandlimited pulse wave with polyBLEP anti-aliasing (Osc1 raw signal)
    let osc1Raw = voice.phase < duty ? 1.0 : -1.0;
    osc1Raw -= this.polyBLEP(voice.phase, phInc);
    osc1Raw += this.polyBLEP((voice.phase - duty + 1.0) % 1.0, phInc);

    // Sub oscillator
    let subVolNow =
      params.subVol.length > 1 ? params.subVol[sampleIndex] : params.subVol[0];
    // Apply aftertouch modulation to sub volume and clamp to [0, 1]
    subVolNow = Math.max(0, Math.min(1, subVolNow + aftertouchMods.sub1Volume));
    let subOsc = 0.0;
    if (subVolNow > 0) {
      let subSquare = voice.subPhase < 0.5 ? 1.0 : -1.0;
      subSquare -= this.polyBLEP(voice.subPhase, subPhInc);
      subSquare += this.polyBLEP((voice.subPhase - 0.5 + 1.0) % 1.0, subPhInc);
      subOsc = subSquare * subVolNow;
    }

    // Apply main oscillator volume and mix with sub oscillator
    let oscVolNow =
      params.oscVol.length > 1 ? params.oscVol[sampleIndex] : params.oscVol[0];
    // Apply aftertouch modulation to oscillator volume and clamp to [0, 1]
    oscVolNow = Math.max(0, Math.min(1, oscVolNow + aftertouchMods.osc1Volume));
    let osc1Output = osc1Raw * oscVolNow + subOsc;

    // Apply Osc2 volume (osc2Raw already calculated above for FM)
    let osc2VolNow =
      params.osc2Vol.length > 1
        ? params.osc2Vol[sampleIndex]
        : params.osc2Vol[0];
    // Apply aftertouch modulation to osc2 volume and clamp to [0, 1]
    osc2VolNow = Math.max(
      0,
      Math.min(1, osc2VolNow + aftertouchMods.osc2Volume)
    );
    let osc2Output = 0.0;
    if (osc2VolNow > 0) {
      osc2Output = osc2Raw * osc2VolNow;
    }

    // Get sub2 volume parameter
    let sub2VolNow =
      params.sub2Vol.length > 1
        ? params.sub2Vol[sampleIndex]
        : params.sub2Vol[0];
    // Apply aftertouch modulation to sub2 volume and clamp to [0, 1]
    sub2VolNow = Math.max(
      0,
      Math.min(1, sub2VolNow + aftertouchMods.sub2Volume)
    );

    // Sub oscillator 2 (one octave down, same waveform as Osc2)
    let sub2Output = 0.0;
    if (sub2VolNow > 0) {
      const sub2Freq = osc2Freq * 0.5;
      const sub2PhInc = sub2Freq / sr;
      voice.sub2Phase += sub2PhInc;
      if (voice.sub2Phase >= 1) voice.sub2Phase -= 1;
      sub2Output =
        this.generateWaveform(voice.sub2Phase, sub2PhInc, osc2WaveformNow) *
        sub2VolNow;
    }

    // Ring Modulator (multiply raw Osc1 and Osc2 signals)
    let ringVolNow =
      params.ringVol.length > 1
        ? params.ringVol[sampleIndex]
        : params.ringVol[0];
    // Apply aftertouch modulation to ring volume and clamp to [0, 1]
    ringVolNow = Math.max(
      0,
      Math.min(1, ringVolNow + aftertouchMods.ringVolume)
    );
    let ringOutput = 0.0;
    if (ringVolNow > 0) {
      ringOutput = osc1Raw * osc2Raw * ringVolNow;
    }

    // Mix all oscillators
    let y = osc1Output + osc2Output + sub2Output + ringOutput;

    // Add noise (global monophonic noise with volume control)
    let noiseVolNow =
      params.noiseVol.length > 1
        ? params.noiseVol[sampleIndex]
        : params.noiseVol[0];
    if (noiseVolNow > 0) {
      const noiseSignal = this.generateNoise();
      // Add noise to oscillator mix
      y += noiseSignal * noiseVolNow;
    }

    // Apply filters (HPF -> LPF in series)
    let hpfCutoffNow =
      params.hpfCutoff.length > 1
        ? params.hpfCutoff[sampleIndex]
        : params.hpfCutoff[0];
    // Apply aftertouch modulation to HPF cutoff and clamp to [20, 20000]
    hpfCutoffNow = Math.max(
      20,
      Math.min(20000, hpfCutoffNow + aftertouchMods.hpCutoff * 5000)
    );

    // Apply filter envelope modulation to HPF cutoff
    const hpEnvAmount = params.hpEnvAmount;
    if (hpEnvAmount !== 0) {
      // Scale envelope from 0-1 to -1 to +1 based on amount, then apply exponential scaling
      const envMod = (voice.filterEnv * 2 - 1) * hpEnvAmount;
      // Apply exponential scaling: positive values boost frequency, negative values cut
      const freqMultiplier = Math.pow(2, envMod * 5); // ±5 octaves max
      hpfCutoffNow = Math.max(
        20,
        Math.min(20000, hpfCutoffNow * freqMultiplier)
      );
    }

    let hpfResonanceNow =
      params.hpfResonance.length > 1
        ? params.hpfResonance[sampleIndex]
        : params.hpfResonance[0];
    // Apply aftertouch modulation to HPF resonance and clamp to [0, 0.95]
    hpfResonanceNow = Math.max(
      0,
      Math.min(0.95, hpfResonanceNow + aftertouchMods.hpResonance * 0.5)
    );

    let lpfCutoffNow =
      params.filterCutoff.length > 1
        ? params.filterCutoff[sampleIndex]
        : params.filterCutoff[0];
    // Apply aftertouch modulation to LPF cutoff and clamp to [20, 20000]
    lpfCutoffNow = Math.max(
      20,
      Math.min(20000, lpfCutoffNow + aftertouchMods.lpCutoff * 5000)
    );

    // Apply filter envelope modulation to LPF cutoff
    const lpEnvAmount = params.lpEnvAmount;
    if (lpEnvAmount !== 0) {
      // Scale envelope from 0-1 to -1 to +1 based on amount, then apply exponential scaling
      const envMod = (voice.filterEnv * 2 - 1) * lpEnvAmount;
      // Apply exponential scaling: positive values boost frequency, negative values cut
      const freqMultiplier = Math.pow(2, envMod * 5); // ±5 octaves max
      lpfCutoffNow = Math.max(
        20,
        Math.min(20000, lpfCutoffNow * freqMultiplier)
      );
    }

    let lpfResonanceNow =
      params.filterResonance.length > 1
        ? params.filterResonance[sampleIndex]
        : params.filterResonance[0];
    // Apply aftertouch modulation to LPF resonance and clamp to [0, 0.95]
    lpfResonanceNow = Math.max(
      0,
      Math.min(0.95, lpfResonanceNow + aftertouchMods.lpResonance * 0.5)
    );

    // First apply 18dB HPF
    y = voice.hpf.processSample(
      y,
      hpfCutoffNow,
      hpfResonanceNow,
      this.sampleRate,
      1
    );
    // Then apply 24dB LPF
    y = voice.lpf.processSample(
      y,
      lpfCutoffNow,
      lpfResonanceNow,
      this.sampleRate,
      0
    );

    // ADSR envelope
    const envFloor = 0.0001;
    const envA = params.envA;
    const envD = params.envD;
    const envS = params.envS;
    const envR = params.envR;

    // Attack
    if (voice.envState === 'attack') {
      if (envA <= 0) {
        voice.env = 1.0;
        voice.envState = 'decay';
      } else {
        const attackCoeff = 1.0 - Math.exp(-1.0 / (envA * sr));
        voice.env += (1.0 - voice.env) * attackCoeff;
        if (voice.env >= 0.9999) {
          voice.env = 1.0;
          voice.envState = 'decay';
        }
      }
    }
    // Decay
    if (voice.envState === 'decay') {
      voice.sustainLevel = Math.max(envFloor, envS);
      if (envD <= 0) {
        voice.env = voice.sustainLevel;
        voice.envState = voice.gate ? 'sustain' : 'release';
      } else {
        const decayCoeff = 1.0 - Math.exp(-1.0 / (envD * sr));
        voice.env += (voice.sustainLevel - voice.env) * decayCoeff;
        if (Math.abs(voice.env - voice.sustainLevel) < 0.0001) {
          voice.env = voice.sustainLevel;
          voice.envState = voice.gate ? 'sustain' : 'release';
        }
      }
    }
    // Sustain
    if (voice.envState === 'sustain') {
      voice.sustainLevel = Math.max(envFloor, envS);
      voice.env = voice.sustainLevel;
      if (!voice.gate) voice.envState = 'release';
    }
    // Release
    if (voice.envState === 'release') {
      if (envR <= 0) {
        voice.env = 0.0;
        voice.envState = 'idle';
        voice.active = false;
        if (voice.midi >= 0) {
          this.noteToVoice.delete(voice.midi);
          voice.midi = -1;
        }
      } else {
        const releaseCoeff = 1.0 - Math.exp(-1.0 / (envR * sr));
        voice.env += (envFloor - voice.env) * releaseCoeff;
        if (voice.env <= envFloor * 1.5) {
          voice.env = 0.0;
          voice.envState = 'idle';
          voice.active = false;
          if (voice.midi >= 0) {
            this.noteToVoice.delete(voice.midi);
            voice.midi = -1;
          }
        }
      }
    }

    // Filter ADSR envelope
    const filterEnvFloor = 0.0001;
    const filterEnvA = params.filterEnvA;
    const filterEnvD = params.filterEnvD;
    const filterEnvS = params.filterEnvS;
    const filterEnvR = params.filterEnvR;

    // Filter Attack
    if (voice.filterEnvState === 'attack') {
      if (filterEnvA <= 0) {
        voice.filterEnv = 1.0;
        voice.filterEnvState = 'decay';
      } else {
        const attackCoeff = 1.0 - Math.exp(-1.0 / (filterEnvA * sr));
        voice.filterEnv += (1.0 - voice.filterEnv) * attackCoeff;
        if (voice.filterEnv >= 0.9999) {
          voice.filterEnv = 1.0;
          voice.filterEnvState = 'decay';
        }
      }
    }
    // Filter Decay
    if (voice.filterEnvState === 'decay') {
      voice.filterSustainLevel = Math.max(filterEnvFloor, filterEnvS);
      if (filterEnvD <= 0) {
        voice.filterEnv = voice.filterSustainLevel;
        voice.filterEnvState = voice.gate ? 'sustain' : 'release';
      } else {
        const decayCoeff = 1.0 - Math.exp(-1.0 / (filterEnvD * sr));
        voice.filterEnv +=
          (voice.filterSustainLevel - voice.filterEnv) * decayCoeff;
        if (Math.abs(voice.filterEnv - voice.filterSustainLevel) < 0.0001) {
          voice.filterEnv = voice.filterSustainLevel;
          voice.filterEnvState = voice.gate ? 'sustain' : 'release';
        }
      }
    }
    // Filter Sustain
    if (voice.filterEnvState === 'sustain') {
      voice.filterSustainLevel = Math.max(filterEnvFloor, filterEnvS);
      voice.filterEnv = voice.filterSustainLevel;
      if (!voice.gate) voice.filterEnvState = 'release';
    }
    // Filter Release
    if (voice.filterEnvState === 'release') {
      if (filterEnvR <= 0) {
        voice.filterEnv = 0.0;
        voice.filterEnvState = 'idle';
      } else {
        const releaseCoeff = 1.0 - Math.exp(-1.0 / (filterEnvR * sr));
        voice.filterEnv += (filterEnvFloor - voice.filterEnv) * releaseCoeff;
        if (voice.filterEnv <= filterEnvFloor * 1.5) {
          voice.filterEnv = 0.0;
          voice.filterEnvState = 'idle';
        }
      }
    }

    // Pan LFO
    let panRateNow =
      params.panRate.length > 1
        ? params.panRate[sampleIndex]
        : params.panRate[0];
    // Apply aftertouch modulation to pan rate and clamp to [0.1, 10]
    panRateNow = Math.max(
      0.1,
      Math.min(10, panRateNow + aftertouchMods.panRate * 5)
    );

    let panDepthNow =
      params.panDepth.length > 1
        ? params.panDepth[sampleIndex]
        : params.panDepth[0];
    // Apply aftertouch modulation to pan depth and clamp to [0, 1]
    panDepthNow = Math.max(
      0,
      Math.min(1, panDepthNow + aftertouchMods.panDepth)
    );
    const panPosNow =
      params.panPos.length > 1 ? params.panPos[sampleIndex] : params.panPos[0];
    voice.panLfoPhase += panRateNow / sr;
    if (voice.panLfoPhase >= 1) voice.panLfoPhase -= 1;
    const panMod = Math.sin(twoPi * voice.panLfoPhase) * panDepthNow;
    // Clamp final pan position to [-1, 1]
    let pan = Math.max(-1, Math.min(1, panPosNow + panMod));

    // Equal-power panning
    const lg = Math.sqrt(0.5 * (1 - pan));
    const rg = Math.sqrt(0.5 * (1 + pan));

    const masterNow =
      params.master.length > 1 ? params.master[sampleIndex] : params.master[0];
    // Mix between fixed velocity (1.0) and actual velocity based on velocityAmt
    const effectiveVelocity =
      1.0 - params.velocityAmt + voice.velocity * params.velocityAmt;
    const out = y * voice.env * effectiveVelocity * masterNow * 0.2; // Reduced volume for polyphony

    return {
      left: out * lg,
      right: out * rg,
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const L = output[0];
    const R = output[1];

    if (!L || !R) return true;

    // Cache parameters
    const params = {
      coarse: parameters.oscillatorCoarseTune,
      fine: parameters.oscillatorFineTune,
      pitchBend: parameters.pitchBend,
      oscVol: parameters.oscillatorVolume,
      pulseWidth: parameters.pulseWidth,
      pwmDepth: parameters.pulseWidthModulationDepth,
      pwmRate: parameters.pulseWidthModulationRate,
      panPos: parameters.panningPosition,
      panDepth: parameters.panningModulationDepth,
      panRate: parameters.panningModulationRate,
      envA: parameters.envelopeAttack[0],
      envD: parameters.envelopeDecay[0],
      envS: parameters.envelopeSustain[0],
      envR: parameters.envelopeRelease[0],
      subVol: parameters.subOscillatorVolume,
      fmDepth: parameters.frequencyModulationDepth,
      osc2Waveform: parameters.oscillator2Waveform[0],
      osc2Coarse: parameters.oscillator2CoarseTune[0],
      osc2Fine: parameters.oscillator2FineTune[0],
      osc2Vol: parameters.oscillator2Volume,
      sub2Vol: parameters.subOscillator2Volume,
      hardSync: parameters.oscillator2HardSync[0],
      ringVol: parameters.ringModulatorVolume,
      noiseVol: parameters.noiseVolume,
      master: parameters.masterVolume,
      velocityAmt: parameters.velocityAmount[0],
      filterCutoff: parameters.filterCutoff,
      filterResonance: parameters.filterResonance,
      hpfCutoff: parameters.hpfCutoff,
      hpfResonance: parameters.hpfResonance,
      filterEnvA: parameters.filterEnvAttack[0],
      filterEnvD: parameters.filterEnvDecay[0],
      filterEnvS: parameters.filterEnvSustain[0],
      filterEnvR: parameters.filterEnvRelease[0],
      lpEnvAmount: parameters.lpEnvAmount[0],
      hpEnvAmount: parameters.hpEnvAmount[0],
      aftertouchDest1: parameters.aftertouchDest1[0],
      aftertouchAmount1: parameters.aftertouchAmount1[0],
      aftertouchDest2: parameters.aftertouchDest2[0],
      aftertouchAmount2: parameters.aftertouchAmount2[0],
      aftertouchDest3: parameters.aftertouchDest3[0],
      aftertouchAmount3: parameters.aftertouchAmount3[0],
      aftertouchDest4: parameters.aftertouchDest4[0],
      aftertouchAmount4: parameters.aftertouchAmount4[0],
    };

    // Clear output buffers
    for (let i = 0; i < L.length; i++) {
      L[i] = 0;
      R[i] = 0;
    }

    // Process each voice and mix
    for (let voiceIndex = 0; voiceIndex < this.maxVoices; voiceIndex++) {
      const voice = this.voices[voiceIndex];

      for (let i = 0; i < L.length; i++) {
        const voiceOutput = this.processVoice(voice, params, i);
        L[i] += voiceOutput.left;
        R[i] += voiceOutput.right;
      }
    }

    return true;
  }
}

registerProcessor('mono-pwm-synth', PolyPWMSynthProcessor);
