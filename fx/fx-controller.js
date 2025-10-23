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
  }

  async loadMetadata() {
    const { HardClipEffect } = await import('./effects/hardclip.js');
    const { PhaserEffect } = await import('./effects/phaser.js');
    const { BitCrusherEffect } = await import('./effects/bitcrusher.js');
    const { ChorusEffect } = await import('./effects/chorus.js');
    const { DelayEffect } = await import('./effects/delay.js');
    const { ReverbEffect } = await import('./effects/reverb.js');
    const { FlangerEffect } = await import('./effects/flanger.js');
    const { TremoloEffect } = await import('./effects/tremolo.js');
    const { AutoWahEffect } = await import('./effects/autowah.js');
    const { FreqShifterEffect } = await import('./effects/freqshifter.js');

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
    const instanceId = `${effectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    // Check if effect still exists to prevent race conditions
    if (!this.activeEffects.has(instanceId)) {
      console.warn(
        `Attempt to set parameter on non-existent effect ${instanceId}`
      );
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

  handleMessage(msg) {
    if (msg.type === 'effectAdded') {
      this.chainOrder.push(msg.instanceId);

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
      window.dispatchEvent(
        new CustomEvent('fxChainChanged', {
          detail: { type: 'removed', instanceId: msg.instanceId },
        })
      );
    }
  }

  clearChain() {
    this.fxNode.port.postMessage({ type: 'clear' });
    this.activeEffects.clear();
    this.chainOrder = [];
  }
}
