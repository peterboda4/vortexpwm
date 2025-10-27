// tests/audio-synth.test.js - Unit tests for audio/synth.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  MockAudioContext,
  MockAudioWorkletNode,
  setupGlobalAudioMocks,
  cleanupGlobalAudioMocks,
} from './mocks/audio-context-mock.js';
import { Synth, checkBrowserCompatibility } from '../audio/synth.js';

describe('checkBrowserCompatibility', () => {
  beforeEach(() => {
    setupGlobalAudioMocks();
  });

  afterEach(() => {
    cleanupGlobalAudioMocks();
  });

  it('should return supported=true when all features are available', () => {
    const result = checkBrowserCompatibility();
    assert.strictEqual(result.supported, true);
    assert.deepStrictEqual(result.missing, []);
    assert.strictEqual(result.message, 'Browser is compatible');
  });

  it('should return supported=false when AudioContext is missing', () => {
    delete globalThis.window.AudioContext;
    delete globalThis.window.webkitAudioContext;

    const result = checkBrowserCompatibility();
    assert.strictEqual(result.supported, false);
    assert.ok(result.missing.includes('Web Audio API'));
    assert.ok(result.message.includes("doesn't support"));
  });

  it('should detect missing AudioWorklet support', () => {
    // Mock a context without audioWorklet support
    class OldAudioContext {
      constructor() {
        this.sampleRate = 48000;
        this.currentTime = 0;
        this.state = 'suspended';
      }
    }

    globalThis.window.AudioContext = OldAudioContext;
    globalThis.window.webkitAudioContext = OldAudioContext;

    const result = checkBrowserCompatibility();
    assert.strictEqual(result.supported, false);
    assert.ok(result.missing.includes('AudioWorklet'));
  });
});

describe('Synth class', () => {
  let synth;

  beforeEach(() => {
    setupGlobalAudioMocks();
    synth = new Synth();
  });

  afterEach(() => {
    cleanupGlobalAudioMocks();
  });

  describe('constructor', () => {
    it('should initialize with null ctx and node', () => {
      assert.strictEqual(synth.ctx, null);
      assert.strictEqual(synth.node, null);
      assert.strictEqual(synth.fxController, null);
    });

    it('should initialize state correctly', () => {
      assert.strictEqual(synth.state.started, false);
      assert.strictEqual(synth.state.initializing, false);
    });

    it('should initialize rate limiting structures', () => {
      assert.ok(synth.paramUpdateTimestamps instanceof Map);
      assert.strictEqual(synth.paramUpdateThrottle, 1);
    });
  });

  describe('setupStateMonitoring', () => {
    it('should do nothing if ctx is null', () => {
      synth.setupStateMonitoring();
      assert.strictEqual(synth.stateChangeHandler, null);
    });

    it('should setup state change handler when ctx exists', async () => {
      await synth.init();
      assert.ok(synth.stateChangeHandler !== null);
      assert.strictEqual(synth.ctx._stateChangeHandlers.length, 1);
    });

    it('should attempt to resume suspended context', async () => {
      await synth.init();
      await synth.start();

      // Manually suspend and trigger state change
      synth.ctx.state = 'suspended';
      synth.ctx._triggerStateChange();

      // Should attempt auto-resume (check that it gets back to running)
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.strictEqual(synth.ctx.state, 'running');
    });
  });

  describe('init()', () => {
    it('should create AudioContext with interactive latency', async () => {
      const state = await synth.init();

      assert.ok(synth.ctx instanceof MockAudioContext);
      assert.strictEqual(state.initializing, false);
    });

    it('should prevent multiple simultaneous init calls', async () => {
      const promise1 = synth.init();
      const promise2 = synth.init();

      const result1 = await promise1;
      const result2 = await promise2;

      assert.strictEqual(result1, result2);
      assert.strictEqual(synth.state.initializing, false);
    });

    it('should skip init if already initialized', async () => {
      await synth.init();
      const ctx1 = synth.ctx;

      await synth.init();
      const ctx2 = synth.ctx;

      assert.strictEqual(ctx1, ctx2);
    });

    it('should load AudioWorklet module', async () => {
      await synth.init();

      assert.ok(
        synth.ctx.audioWorklet.hasModule('./worklet/synth-processor.js')
      );
    });

    it('should handle init failure gracefully', async () => {
      // Mock a failing AudioWorklet.addModule
      globalThis.window.AudioContext = class FailingAudioContext extends MockAudioContext {
        constructor(options) {
          super(options);
          this.audioWorklet = {
            addModule: async () => {
              throw new Error('Failed to load worklet');
            },
          };
        }
      };

      setupGlobalAudioMocks();
      synth = new Synth();

      await assert.rejects(
        async () => {
          await synth.init();
        },
        {
          message: 'Failed to load worklet',
        }
      );

      assert.strictEqual(synth.state.initializing, false);
    });

    it('should setup state monitoring after init', async () => {
      await synth.init();
      assert.ok(synth.stateChangeHandler !== null);
    });
  });

  describe('start()', () => {
    it('should require init() before start()', async () => {
      await assert.rejects(
        async () => {
          await synth.start();
        },
        {
          message: /not initialized/i,
        }
      );
    });

    it('should resume AudioContext', async () => {
      await synth.init();
      await synth.start();

      assert.strictEqual(synth.ctx.state, 'running');
      assert.strictEqual(synth.state.started, true);
    });

    it('should not start multiple times', async () => {
      await synth.init();
      await synth.start();

      const ctx1State = synth.ctx.state;
      await synth.start();
      const ctx2State = synth.ctx.state;

      assert.strictEqual(ctx1State, ctx2State);
    });
  });

  describe('noteOn()', () => {
    beforeEach(async () => {
      await synth.init();
      await synth.start();
    });

    it('should send noteOn message to worklet', () => {
      synth.noteOn(60, 0.8);

      const message = synth.node.getLastMessage();
      assert.strictEqual(message.type, 'noteOn');
      assert.strictEqual(message.note, 60);
      assert.strictEqual(message.velocity, 0.8);
    });

    it('should validate MIDI note range (0-127)', () => {
      // Test valid notes
      synth.noteOn(0, 0.5);
      let message = synth.node.getLastMessage();
      assert.strictEqual(message.note, 0);

      synth.noteOn(127, 0.5);
      message = synth.node.getLastMessage();
      assert.strictEqual(message.note, 127);

      synth.noteOn(60, 0.5);
      message = synth.node.getLastMessage();
      assert.strictEqual(message.note, 60);
    });

    it('should reject invalid MIDI notes', () => {
      const initialMessage = synth.node.getLastMessage();

      // Invalid notes should not send messages
      synth.noteOn(-1, 0.5);
      synth.noteOn(128, 0.5);
      synth.noteOn(1000, 0.5);

      const finalMessage = synth.node.getLastMessage();
      assert.strictEqual(initialMessage, finalMessage);
    });

    it('should clamp velocity to 0-1 range', () => {
      synth.noteOn(60, 1.5);
      let message = synth.node.getLastMessage();
      assert.strictEqual(message.velocity, 1.0);

      synth.noteOn(60, -0.5);
      message = synth.node.getLastMessage();
      assert.strictEqual(message.velocity, 0.0);

      synth.noteOn(60, 0.5);
      message = synth.node.getLastMessage();
      assert.strictEqual(message.velocity, 0.5);
    });
  });

  describe('noteOff()', () => {
    beforeEach(async () => {
      await synth.init();
      await synth.start();
    });

    it('should send noteOff message to worklet', () => {
      synth.noteOff(60);

      const message = synth.node.getLastMessage();
      assert.strictEqual(message.type, 'noteOff');
      assert.strictEqual(message.note, 60);
    });

    it('should validate MIDI note range', () => {
      const initialMessage = synth.node.getLastMessage();

      synth.noteOff(-1);
      synth.noteOff(128);

      const finalMessage = synth.node.getLastMessage();
      assert.strictEqual(initialMessage, finalMessage);
    });
  });

  describe('allNotesOff()', () => {
    beforeEach(async () => {
      await synth.init();
      await synth.start();
    });

    it('should send allNotesOff message to worklet', () => {
      synth.allNotesOff();

      const message = synth.node.getLastMessage();
      assert.strictEqual(message.type, 'allNotesOff');
    });
  });

  describe('setParam()', () => {
    beforeEach(async () => {
      await synth.init();
      await synth.start();
    });

    it('should update AudioParam value', () => {
      // Assuming oscillatorVolume is a parameter
      synth.setParam('oscillatorVolume', 0.5);

      const param = synth.node.parameters.get('oscillatorVolume');
      assert.ok(param);
      assert.strictEqual(param.value, 0.5);
    });

    it('should track parameter update timestamps for rate limiting', () => {
      const paramName = 'oscillatorVolume';

      // Set parameter
      synth.setParam(paramName, 0.5);

      // Check that timestamp was recorded
      assert.ok(synth.paramUpdateTimestamps.has(paramName));
      assert.ok(typeof synth.paramUpdateTimestamps.get(paramName) === 'number');
    });

    it('should handle invalid parameter names gracefully', () => {
      // Should not throw
      assert.doesNotThrow(() => {
        synth.setParam('nonExistentParam', 0.5);
      });
    });
  });

  describe('parameter access', () => {
    beforeEach(async () => {
      await synth.init();
      await synth.start();
    });

    it('should allow direct parameter value access via node.parameters', () => {
      synth.setParam('oscillatorVolume', 0.7);
      const param = synth.node.parameters.get('oscillatorVolume');
      assert.ok(param);
      assert.strictEqual(param.value, 0.7);
    });
  });
});
