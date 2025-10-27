/**
 * FX Controller - Main thread controller for FX chain
 * Manages AudioWorkletNode and provides high-level API
 */

export class FXController {
  constructor() {
    this.audioContext = null;
    this.fxNode = null;
    this.effectsMetadata = new Map();
    this.activeEffects = new Map();
    this.chainOrder = [];
    this.metadataLoaded = false;
    this.instanceCounter = 0;
  }

  async loadMetadata() {
    // Load all effect modules in parallel for faster startup
    const [
      { HardClipEffect },
      { PhaserEffect },
      { BitCrusherEffect },
      { ChorusEffect },
      { DelayEffect },
      { ReverbEffect },
      { FlangerEffect },
      { TremoloEffect },
      { AutoWahEffect },
      { FreqShifterEffect },
      { PitchShifterEffect },
    ] = await Promise.all([
      import('./effects/hardclip.js'),
      import('./effects/phaser.js'),
      import('./effects/bitcrusher.js'),
      import('./effects/chorus.js'),
      import('./effects/delay.js'),
      import('./effects/reverb.js'),
      import('./effects/flanger.js'),
      import('./effects/tremolo.js'),
      import('./effects/autowah.js'),
      import('./effects/freqshifter.js'),
      import('./effects/pitchshifter.js'),
    ]);

    this.effectsMetadata.set('hardclip', HardClipEffect.getMetadata());
    this.effectsMetadata.set('phaser', PhaserEffect.getMetadata());
    this.effectsMetadata.set('bitcrusher', BitCrusherEffect.getMetadata());
    this.effectsMetadata.set('chorus', ChorusEffect.getMetadata());
    this.effectsMetadata.set('delay', DelayEffect.getMetadata());
    this.effectsMetadata.set('reverb', ReverbEffect.getMetadata());
    this.effectsMetadata.set('flanger', FlangerEffect.getMetadata());
    this.effectsMetadata.set('tremolo', TremoloEffect.getMetadata());
    this.effectsMetadata.set('autowah', AutoWahEffect.getMetadata());
    this.effectsMetadata.set('freqshifter', FreqShifterEffect.getMetadata());
    this.effectsMetadata.set('pitchshifter', PitchShifterEffect.getMetadata());

    this.metadataLoaded = true;
  }

  async init(audioContext, inputNode) {
    this.audioContext = audioContext;

    // Load metadata first
    await this.loadMetadata();

    await audioContext.audioWorklet.addModule('worklet/fx-chain-processor.js');

    this.fxNode = new AudioWorkletNode(audioContext, 'fx-chain-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    this.fxNode.port.onmessage = (e) => this.handleMessage(e.data);

    inputNode.connect(this.fxNode);
    this.fxNode.connect(audioContext.destination);

    return this.fxNode;
  }

  addEffect(effectId, position = -1) {
    const instanceId = `${effectId}_${++this.instanceCounter}`;

    this.fxNode.port.postMessage({
      type: 'addEffect',
      effectId,
      instanceId,
      position,
    });

    this.activeEffects.set(instanceId, { effectId, enabled: true });

    return instanceId;
  }

  removeEffect(instanceId) {
    this.fxNode.port.postMessage({
      type: 'removeEffect',
      instanceId,
    });

    this.activeEffects.delete(instanceId);
    this.chainOrder = this.chainOrder.filter((id) => id !== instanceId);
  }

  reorderChain(newOrder) {
    this.chainOrder = [...newOrder];

    this.fxNode.port.postMessage({
      type: 'reorderChain',
      order: newOrder,
    });
  }

  setParameter(instanceId, param, value) {
    // Check if effect exists before sending message to prevent race condition
    if (!this.activeEffects.has(instanceId)) {
      console.warn(`Cannot set parameter for removed effect: ${instanceId}`);
      return;
    }

    this.fxNode.port.postMessage({
      type: 'setParameter',
      instanceId,
      param,
      value,
    });
  }

  setEnabled(instanceId, enabled) {
    this.fxNode.port.postMessage({
      type: 'setEnabled',
      instanceId,
      enabled,
    });

    const effect = this.activeEffects.get(instanceId);
    if (effect) effect.enabled = enabled;
  }

  getAvailableEffects() {
    return Array.from(this.effectsMetadata.values());
  }

  getEffectMetadata(effectId) {
    return this.effectsMetadata.get(effectId);
  }

  // Get state of first instance of an effect type (for MIDI CC mapping)
  getEffectState(effectId) {
    // Find first instance of this effect type
    for (const [instanceId, effect] of this.activeEffects.entries()) {
      if (effect.effectId === effectId) {
        return {
          instanceId: instanceId,
          effectId: effectId,
          enabled: effect.enabled,
        };
      }
    }
    return null;
  }

  // Set parameter on first instance of an effect type (for MIDI CC mapping)
  setEffectParam(effectId, param, value) {
    // Find first instance of this effect type
    for (const [instanceId, effect] of this.activeEffects.entries()) {
      if (effect.effectId === effectId) {
        this.setParameter(instanceId, param, value);
        return true;
      }
    }
    console.warn(`No active instance of effect type: ${effectId}`);
    return false;
  }

  handleMessage(msg) {
    if (msg.type === 'effectAdded') {
      // Insert at the reported position to match worklet order
      const position = msg.position >= 0 ? msg.position : this.chainOrder.length;
      this.chainOrder.splice(position, 0, msg.instanceId);

      window.dispatchEvent(
        new CustomEvent('fxChainChanged', {
          detail: {
            type: 'added',
            instanceId: msg.instanceId,
            effectId: msg.effectId,
            position: msg.position,
          },
        })
      );
    } else if (msg.type === 'effectRemoved') {
      // Remove from chainOrder to keep it synchronized
      this.chainOrder = this.chainOrder.filter((id) => id !== msg.instanceId);

      window.dispatchEvent(
        new CustomEvent('fxChainChanged', {
          detail: { type: 'removed', instanceId: msg.instanceId },
        })
      );
    } else if (msg.type === 'error') {
      // Handle error messages from worklet (e.g., race conditions)
      console.warn(`FX Chain error: ${msg.message}`);

      // Dispatch error event for UI feedback
      window.dispatchEvent(
        new CustomEvent('fxError', {
          detail: { message: msg.message },
        })
      );
    }
  }

  clearChain() {
    this.fxNode.port.postMessage({ type: 'clear' });
    this.activeEffects.clear();
    this.chainOrder = [];

    // Notify UI that chain was cleared
    window.dispatchEvent(
      new CustomEvent('fxChainChanged', {
        detail: { type: 'cleared' },
      })
    );
  }
}
