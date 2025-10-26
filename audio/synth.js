// audio/synth.js - sets up AudioContext, AudioWorklet, and exposes a simple API
import { logger } from '../utils/logger.js';

export class Synth {
  constructor() {
    this.ctx = null;
    this.node = null;
    this.fxController = null;
    this.state = {
      started: false,
    };
  }

  async init() {
    if (!this.ctx) {
      logger.init('Initializing AudioContext with interactive latency hint');
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
      });
      logger.info(
        `AudioContext created: sampleRate=${this.ctx.sampleRate}Hz, state=${this.ctx.state}`
      );
    }
    // Load worklet
    logger.debug('Loading AudioWorklet processor: synth-processor.js');
    await this.ctx.audioWorklet.addModule('./worklet/synth-processor.js');

    this.node = new AudioWorkletNode(this.ctx, 'mono-pwm-synth', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: {
        oscillatorCoarseTune: 0,
        oscillatorFineTune: 0,
        pitchBend: 0,
        pitchBendRange: 2,
        oscillatorVolume: 1.0,
        pulseWidth: 0.5,
        pulseWidthModulationDepth: 0.5,
        pulseWidthModulationRate: 2.0,
        panningPosition: 0.0,
        panningModulationDepth: 0.5,
        panningModulationRate: 0.5,
        envelopeAttack: 0.005,
        envelopeDecay: 0.1,
        envelopeSustain: 0.7,
        envelopeRelease: 0.2,
        subOscillatorVolume: 0.0,
        frequencyModulationDepth: 0.0,
        oscillator2Waveform: 0,
        oscillator2CoarseTune: 0,
        oscillator2FineTune: 0,
        oscillator2Volume: 0.0,
        subOscillator2Volume: 0.0,
        oscillator2HardSync: 0,
        ringModulatorVolume: 0.0,
        noiseVolume: 0.0,
        masterVolume: 0.4,
        velocityAmount: 0.5,
        aftertouchDest1: 0,
        aftertouchAmount1: 0.0,
        aftertouchDest2: 0,
        aftertouchAmount2: 0.0,
        aftertouchDest3: 0,
        aftertouchAmount3: 0.0,
        aftertouchDest4: 0,
        aftertouchAmount4: 0.0,
        filterCutoff: 5000,
        filterResonance: 0.1,
        hpfCutoff: 20,
        hpfResonance: 0.1,
        filterEnvAttack: 0.005,
        filterEnvDecay: 0.1,
        filterEnvSustain: 0.7,
        filterEnvRelease: 0.2,
        lpEnvAmount: 0.0,
        hpEnvAmount: 0.0,
      },
    });

    // Connect directly to destination as fallback
    // This will be disconnected if FX chain is successfully initialized
    this.node.connect(this.ctx.destination);
    this.state.started = false;
    logger.info('Synth initialized successfully (fallback connection active)');
    return this.state;
  }

  async initFX() {
    logger.debug('Initializing FX chain');
    const { FXController } = await import('../fx/fx-controller.js');
    this.fxController = new FXController();
    // Disconnect fallback connection before inserting FX chain
    this.node.disconnect();
    await this.fxController.init(this.ctx, this.node);
    logger.info('FX chain initialized and connected');
    return this.fxController;
  }

  async start() {
    if (this.ctx && this.ctx.state !== 'running') {
      logger.debug('Resuming AudioContext');
      await this.ctx.resume();
      this.state.started = true;
      logger.info('AudioContext started (state: running)');
    }
  }

  setParam(name, value) {
    const p = this.node.parameters.get(name);
    if (p) p.value = value;
  }

  noteOn(midi, velocity = 0.9) {
    // Clamp to two octaves in UI layer, but processor supports any note
    this.node.port.postMessage({ type: 'noteOn', midi, velocity });
  }

  noteOff(midi) {
    this.node.port.postMessage({ type: 'noteOff', midi });
  }

  aftertouch(value) {
    // Channel pressure (aftertouch), value 0-127
    this.node.port.postMessage({ type: 'aftertouch', value });
  }
}
