// audio/synth.js - sets up AudioContext, AudioWorklet, and exposes a simple API
import { logger } from '../utils/logger.js';

// Check browser compatibility for required features
export function checkBrowserCompatibility() {
  const missing = [];

  // Check for Web Audio API
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    missing.push('Web Audio API');
    return {
      supported: false,
      missing: missing,
      message: `Your browser doesn't support: ${missing.join(', ')}. Please use a modern browser (Chrome 66+, Edge 79+, Firefox 76+, Safari 14.1+).`,
    };
  }

  // Check for AudioWorklet support
  // AudioWorklet was added in Chrome 66, Safari 14.1, Firefox 76
  // We check if the constructor has the audioWorklet property descriptor
  const supportsAudioWorklet =
    'audioWorklet' in AudioContextClass.prototype ||
    typeof AudioContextClass.prototype.audioWorklet !== 'undefined';

  if (!supportsAudioWorklet) {
    missing.push('AudioWorklet');
  }

  return {
    supported: missing.length === 0,
    missing: missing,
    message: missing.length > 0
      ? `Your browser doesn't support: ${missing.join(', ')}. Please use a modern browser (Chrome 66+, Edge 79+, Firefox 76+, Safari 14.1+).`
      : 'Browser is compatible',
  };
}

export class Synth {
  constructor() {
    this.ctx = null;
    this.node = null;
    this.fxController = null;
    this.state = {
      started: false,
    };
    this.stateChangeHandler = null;
  }

  // Setup AudioContext state monitoring
  setupStateMonitoring() {
    if (!this.ctx) return;

    this.stateChangeHandler = () => {
      logger.info(`AudioContext state changed to: ${this.ctx.state}`);
      if (this.ctx.state === 'suspended' && this.state.started) {
        logger.warn('AudioContext suspended - attempting to resume');
        this.ctx.resume().catch((err) => {
          logger.error('Failed to auto-resume AudioContext:', err);
        });
      }
    };

    this.ctx.addEventListener('statechange', this.stateChangeHandler);
  }

  async init() {
    if (!this.ctx) {
      logger.init('Initializing AudioContext with interactive latency hint');
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)({
          latencyHint: 'interactive',
        });
        logger.info(
          `AudioContext created: sampleRate=${this.ctx.sampleRate}Hz, state=${this.ctx.state}`
        );

        // Validate sample rate
        const sr = this.ctx.sampleRate;
        if (sr !== 44100 && sr !== 48000 && sr !== 96000) {
          logger.warn(
            `Non-standard sample rate detected: ${sr}Hz. Common rates are 44100Hz, 48000Hz, or 96000Hz.`
          );
        }
      } catch (err) {
        logger.error('Failed to create AudioContext:', err);
        throw new Error(
          'Failed to initialize audio. Your browser may not support Web Audio API.'
        );
      }
    }
    // Load worklet
    logger.debug('Loading AudioWorklet processor: synth-processor.js');
    try {
      await this.ctx.audioWorklet.addModule('./worklet/synth-processor.js');
    } catch (err) {
      logger.error('Failed to load AudioWorklet processor:', err);
      throw new Error(
        'Failed to load audio processor. Your browser may not support AudioWorklet, or there was a network error.'
      );
    }

    try {
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
    } catch (err) {
      logger.error('Failed to create AudioWorkletNode:', err);
      throw new Error(
        'Failed to create synthesizer audio node. The audio processor may not be registered correctly.'
      );
    }

    // Connect directly to destination as fallback
    // This will be disconnected if FX chain is successfully initialized
    this.node.connect(this.ctx.destination);
    this.state.started = false;

    // Setup state monitoring for auto-resume
    this.setupStateMonitoring();

    logger.info('Synth initialized successfully (fallback connection active)');
    return this.state;
  }

  async initFX() {
    logger.debug('Initializing FX chain');
    try {
      const { FXController } = await import('../fx/fx-controller.js');
      this.fxController = new FXController();
      // Disconnect fallback connection before inserting FX chain
      this.node.disconnect();
      await this.fxController.init(this.ctx, this.node);
      logger.info('FX chain initialized and connected');
      return this.fxController;
    } catch (err) {
      logger.error('Failed to initialize FX chain:', err);
      // Re-connect fallback since FX initialization failed
      this.node.connect(this.ctx.destination);
      throw new Error('Failed to initialize effects chain. Using direct audio output.');
    }
  }

  async start() {
    if (this.ctx && this.ctx.state !== 'running') {
      logger.debug('Resuming AudioContext');
      try {
        await this.ctx.resume();
        this.state.started = true;
        logger.info('AudioContext started (state: running)');
      } catch (err) {
        logger.error('Failed to resume AudioContext:', err);
        throw new Error('Failed to start audio. Please check your browser permissions.');
      }
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

  // Cleanup resources
  destroy() {
    if (this.ctx && this.stateChangeHandler) {
      this.ctx.removeEventListener('statechange', this.stateChangeHandler);
    }
    if (this.ctx) {
      this.ctx.close().catch((err) => {
        logger.error('Error closing AudioContext:', err);
      });
    }
  }
}
