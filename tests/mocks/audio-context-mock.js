// tests/mocks/audio-context-mock.js - Mock AudioContext for unit testing

/**
 * Mock AudioParam for testing
 */
export class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = -3.4028235e38;
    this.maxValue = 3.4028235e38;
    this.automationRate = 'a-rate';
  }

  setValueAtTime(value, startTime) {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(value, endTime) {
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value, endTime) {
    this.value = value;
    return this;
  }

  setTargetAtTime(target, startTime, timeConstant) {
    this.value = target;
    return this;
  }

  setValueCurveAtTime(values, startTime, duration) {
    if (values.length > 0) {
      this.value = values[values.length - 1];
    }
    return this;
  }

  cancelScheduledValues(startTime) {
    return this;
  }

  cancelAndHoldAtTime(cancelTime) {
    return this;
  }
}

/**
 * Mock AudioWorkletNode for testing
 */
export class MockAudioWorkletNode {
  constructor(context, name, options = {}) {
    this.context = context;
    this.name = name;
    this.options = options;
    this.parameters = new Map();
    this.port = {
      postMessage: (message) => {
        this._lastMessage = message;
      },
      onmessage: null,
      addEventListener: (type, listener) => {
        if (type === 'message') {
          this.port.onmessage = listener;
        }
      },
      removeEventListener: (type, listener) => {
        if (type === 'message' && this.port.onmessage === listener) {
          this.port.onmessage = null;
        }
      },
    };
    this._lastMessage = null;
    this.numberOfInputs = 0;
    this.numberOfOutputs = 1;
    this.channelCount = 2;
    this.channelCountMode = 'explicit';
    this.channelInterpretation = 'speakers';
    this._connected = false;

    // Initialize parameters based on options
    if (options.parameterData) {
      for (const [paramName, paramConfig] of Object.entries(
        options.parameterData
      )) {
        this.parameters.set(
          paramName,
          new MockAudioParam(paramConfig.defaultValue || 0)
        );
      }
    }
  }

  connect(destination) {
    this._connected = true;
    this._destination = destination;
    return destination;
  }

  disconnect() {
    this._connected = false;
    this._destination = null;
  }

  // Helper for testing
  getLastMessage() {
    return this._lastMessage;
  }

  // Simulate receiving a message from worklet
  simulateMessage(data) {
    if (this.port.onmessage) {
      this.port.onmessage({ data });
    }
  }
}

/**
 * Mock AudioWorklet for testing
 */
export class MockAudioWorklet {
  constructor(context) {
    this.context = context;
    this._modules = new Set();
  }

  async addModule(moduleURL, options = {}) {
    // Simulate async module loading
    await new Promise((resolve) => setTimeout(resolve, 0));
    this._modules.add(moduleURL);
    return;
  }

  hasModule(moduleURL) {
    return this._modules.has(moduleURL);
  }
}

/**
 * Mock AudioDestinationNode for testing
 */
export class MockAudioDestinationNode {
  constructor(context) {
    this.context = context;
    this.channelCount = 2;
    this.channelCountMode = 'explicit';
    this.channelInterpretation = 'speakers';
    this.maxChannelCount = 2;
    this.numberOfInputs = 1;
    this.numberOfOutputs = 0;
  }

  connect() {
    throw new Error('Cannot connect from destination node');
  }

  disconnect() {
    // No-op
  }
}

/**
 * Mock AudioContext for testing
 */
export class MockAudioContext {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 48000;
    this.currentTime = 0;
    this.state = 'suspended';
    this.baseLatency = 0.005;
    this.outputLatency = 0;
    this.audioWorklet = new MockAudioWorklet(this);
    this.destination = new MockAudioDestinationNode(this);
    this._stateChangeHandlers = [];
    this._resumePromise = null;
    this._suspendPromise = null;
    this._closePromise = null;
  }

  async resume() {
    if (this.state === 'running') {
      return;
    }
    this.state = 'running';
    this._triggerStateChange();
    return;
  }

  async suspend() {
    if (this.state === 'suspended') {
      return;
    }
    this.state = 'suspended';
    this._triggerStateChange();
    return;
  }

  async close() {
    this.state = 'closed';
    this._triggerStateChange();
    return;
  }

  addEventListener(eventName, handler) {
    if (eventName === 'statechange') {
      this._stateChangeHandlers.push(handler);
    }
  }

  removeEventListener(eventName, handler) {
    if (eventName === 'statechange') {
      const index = this._stateChangeHandlers.indexOf(handler);
      if (index > -1) {
        this._stateChangeHandlers.splice(index, 1);
      }
    }
  }

  _triggerStateChange() {
    for (const handler of this._stateChangeHandlers) {
      handler();
    }
  }

  // Helper for testing
  simulateTimeAdvance(seconds) {
    this.currentTime += seconds;
  }

  createGain() {
    return {
      gain: new MockAudioParam(1),
      connect: () => {},
      disconnect: () => {},
    };
  }

  createOscillator() {
    return {
      frequency: new MockAudioParam(440),
      detune: new MockAudioParam(0),
      type: 'sine',
      start: () => {},
      stop: () => {},
      connect: () => {},
      disconnect: () => {},
    };
  }
}

// Add audioWorklet to prototype for compatibility check
if (!MockAudioContext.prototype.hasOwnProperty('audioWorklet')) {
  Object.defineProperty(MockAudioContext.prototype, 'audioWorklet', {
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Setup global mocks for Web Audio API in Node.js environment
 */
export function setupGlobalAudioMocks() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {};
  }

  globalThis.window.AudioContext = MockAudioContext;
  globalThis.window.webkitAudioContext = MockAudioContext;
  globalThis.window.AudioWorkletNode = MockAudioWorkletNode;
  globalThis.AudioContext = MockAudioContext;
  globalThis.webkitAudioContext = MockAudioContext;
  globalThis.AudioWorkletNode = MockAudioWorkletNode;
}

/**
 * Cleanup global mocks
 */
export function cleanupGlobalAudioMocks() {
  if (typeof globalThis.window !== 'undefined') {
    delete globalThis.window.AudioContext;
    delete globalThis.window.webkitAudioContext;
    delete globalThis.window.AudioWorkletNode;
  }
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  delete globalThis.AudioWorkletNode;
}
