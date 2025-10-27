/**
 * FX Controller - Main thread controller for FX chain
 * Manages AudioWorkletNode and provides high-level API
 */

import { parameterManager } from './parameter-manager.js';
import {
  EFFECT_REGISTRY,
  getEffectImportPaths,
  getEffectClassNames,
} from './effect-registry.js';

export class FXController {
  constructor() {
    this.audioContext = null;
    this.fxNode = null;
    this.effectsMetadata = new Map();
    this.activeEffects = new Map();
    this.chainOrder = [];
    this.metadataLoaded = false;
    this.instanceCounter = 0;
    this.parameterManager = parameterManager;
  }

  async loadMetadata() {
    // Automatically load all effects from registry
    const importPaths = getEffectImportPaths();
    const classNames = getEffectClassNames();

    // Load all effect modules in parallel for faster startup
    const effectModules = await Promise.all(
      importPaths.map((path) => import(path))
    );

    // Store metadata and register with parameter manager
    for (let i = 0; i < effectModules.length; i++) {
      const module = effectModules[i];
      const { id, class: className } = classNames[i];

      // Get the effect class from the module
      const EffectClass = module[className];
      if (!EffectClass) {
        console.error(
          `Effect class ${className} not found in module ${importPaths[i]}`
        );
        continue;
      }

      const metadata = EffectClass.getMetadata();
      this.effectsMetadata.set(id, metadata);
      this.parameterManager.registerEffect(id, metadata.parameters);
    }

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

    // Clean up parameter manager state
    this.parameterManager.clearInstance(instanceId);
  }

  reorderChain(newOrder) {
    this.chainOrder = [...newOrder];

    this.fxNode.port.postMessage({
      type: 'reorderChain',
      order: newOrder,
    });
  }

  setParameter(instanceId, param, value) {
    // Check if metadata is loaded to prevent validation warnings
    if (!this.metadataLoaded) {
      console.warn(
        `Cannot set parameter before metadata loaded: ${instanceId}.${param}`
      );
      return value;
    }

    // Check if effect exists before sending message to prevent race condition
    if (!this.activeEffects.has(instanceId)) {
      console.warn(
        `Cannot set parameter for removed effect: ${instanceId}`
      );
      return;
    }

    const effect = this.activeEffects.get(instanceId);
    const effectId = effect.effectId;

    // Validate parameter value using parameter manager
    const validatedValue = this.parameterManager.setValue(
      instanceId,
      effectId,
      param,
      value
    );

    this.fxNode.port.postMessage({
      type: 'setParameter',
      instanceId,
      param,
      value: validatedValue,
    });

    return validatedValue;
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

    // Clean up parameter manager state for all instances
    for (const instanceId of this.activeEffects.keys()) {
      this.parameterManager.clearInstance(instanceId);
    }

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
