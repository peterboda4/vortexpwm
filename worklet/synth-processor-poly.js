// worklet/synth-processor.js - Polyphonic PWM synth with stereo path, autopan, ADSR, master
// Note: run from a secure context (https or localhost).

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
        name: 'masterVolume',
        defaultValue: 0.4,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate',
      },
    ];
  }

  constructor() {
    super();
    this.sampleRate = sampleRate;

    // Voice pool (8 voices max)
    this.maxVoices = 8;
    this.voices = [];
    this.noteToVoice = new Map(); // midi note -> voice index

    // Initialize voice pool
    for (let i = 0; i < this.maxVoices; i++) {
      this.voices.push({
        // Oscillator state
        phase: 0.0,
        pwmLfoPhase: Math.random(),
        subPhase: Math.random(),
        panLfoPhase: Math.random(),

        // Envelope
        env: 0.0,
        envState: 'idle',
        sustainLevel: 0.7,

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

    this.noteToVoice.set(midi, voiceIndex);
  }

  noteOff(midi) {
    if (this.noteToVoice.has(midi)) {
      const voiceIndex = this.noteToVoice.get(midi);
      const voice = this.voices[voiceIndex];
      voice.gate = false;
      voice.envState = 'release';
    }
  }

  midiToHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
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

  processVoice(voice, params, sampleIndex) {
    if (!voice.active) return { left: 0, right: 0 };

    const sr = this.sampleRate;
    const twoPi = 2 * Math.PI;

    // Frequency with coarse semitone offset and pitch bend
    const coarseNow =
      params.coarse.length > 1 ? params.coarse[sampleIndex] : params.coarse[0];
    const pitchBendNow =
      params.pitchBend.length > 1
        ? params.pitchBend[sampleIndex]
        : params.pitchBend[0];
    const semi = voice.midi + coarseNow + pitchBendNow;
    const freq = this.midiToHz(semi);

    // Phase advance
    const phInc = freq / sr;
    voice.phase += phInc;
    if (voice.phase >= 1) voice.phase -= 1;

    // Sub oscillator (one octave down = half frequency)
    const subFreq = freq * 0.5;
    const subPhInc = subFreq / sr;
    voice.subPhase += subPhInc;
    if (voice.subPhase >= 1) voice.subPhase -= 1;

    // PWM LFO
    const pwmRateNow =
      params.pwmRate.length > 1
        ? params.pwmRate[sampleIndex]
        : params.pwmRate[0];
    const pwmDepthNow =
      params.pwmDepth.length > 1
        ? params.pwmDepth[sampleIndex]
        : params.pwmDepth[0];
    voice.pwmLfoPhase += pwmRateNow / sr;
    if (voice.pwmLfoPhase >= 1) voice.pwmLfoPhase -= 1;

    const pwmMod = Math.sin(twoPi * voice.pwmLfoPhase);
    let duty = 0.5 + pwmMod * (0.45 * pwmDepthNow);
    if (duty < 0.05) duty = 0.05;
    if (duty > 0.95) duty = 0.95;

    // Bandlimited pulse wave with polyBLEP anti-aliasing
    let y = voice.phase < duty ? 1.0 : -1.0;
    y -= this.polyBLEP(voice.phase, phInc);
    y += this.polyBLEP((voice.phase - duty + 1.0) % 1.0, phInc);

    // Sub oscillator
    const subVolNow =
      params.subVol.length > 1 ? params.subVol[sampleIndex] : params.subVol[0];
    let subOsc = 0.0;
    if (subVolNow > 0) {
      let subSquare = voice.subPhase < 0.5 ? 1.0 : -1.0;
      subSquare -= this.polyBLEP(voice.subPhase, subPhInc);
      subSquare += this.polyBLEP((voice.subPhase - 0.5 + 1.0) % 1.0, subPhInc);
      subOsc = subSquare * subVolNow;
    }

    // Apply main oscillator volume and mix with sub oscillator
    const oscVolNow =
      params.oscVol.length > 1 ? params.oscVol[sampleIndex] : params.oscVol[0];
    y = y * oscVolNow + subOsc;

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

    // Pan LFO
    const panRateNow =
      params.panRate.length > 1
        ? params.panRate[sampleIndex]
        : params.panRate[0];
    const panDepthNow =
      params.panDepth.length > 1
        ? params.panDepth[sampleIndex]
        : params.panDepth[0];
    const panPosNow =
      params.panPos.length > 1 ? params.panPos[sampleIndex] : params.panPos[0];
    voice.panLfoPhase += panRateNow / sr;
    if (voice.panLfoPhase >= 1) voice.panLfoPhase -= 1;
    const panMod = Math.sin(twoPi * voice.panLfoPhase) * panDepthNow;
    let pan = panPosNow + panMod;
    if (pan < -1) pan = -1;
    if (pan > 1) pan = 1;

    // Equal-power panning
    const lg = Math.sqrt(0.5 * (1 - pan));
    const rg = Math.sqrt(0.5 * (1 + pan));

    const masterNow =
      params.master.length > 1 ? params.master[sampleIndex] : params.master[0];
    const out = y * voice.env * voice.velocity * masterNow * 0.2; // Reduced volume for polyphony

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
      pitchBend: parameters.pitchBend,
      oscVol: parameters.oscillatorVolume,
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
      master: parameters.masterVolume,
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
