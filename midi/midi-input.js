// midi/midi-input.js - Web MIDI API integration with configurable CC mapping
import { logger } from '../utils/logger.js';

const STORAGE_KEY = 'vortexpwm.ccMappings';

const CC_TARGETS = [
  {
    id: 'pwmDepth',
    label: 'PWM Depth',
    group: 'Oscillator',
    defaultCC: 1,
    type: 'synthParam',
    param: 'pulseWidthModulationDepth',
    min: 0,
    max: 1,
  },
  {
    id: 'masterVolume',
    label: 'Master Volume',
    group: 'Mixer',
    defaultCC: 7,
    type: 'synthParam',
    param: 'masterVolume',
    min: 0,
    max: 1,
  },
  {
    id: 'panPosition',
    label: 'Pan Position',
    group: 'Mixer',
    defaultCC: 10,
    type: 'synthParam',
    param: 'panningPosition',
    min: -1,
    max: 1,
  },
  {
    id: 'oscillatorVolume',
    label: 'Oscillator 1 Volume',
    group: 'Mixer',
    defaultCC: 11,
    type: 'synthParam',
    param: 'oscillatorVolume',
    min: 0,
    max: 1,
  },
  {
    id: 'pwmRate',
    label: 'PWM Rate',
    group: 'Oscillator',
    defaultCC: 12,
    type: 'synthParam',
    param: 'pulseWidthModulationRate',
    min: 0.1,
    max: 10,
  },
  {
    id: 'panDepth',
    label: 'Pan Depth',
    group: 'Mixer',
    defaultCC: 13,
    type: 'synthParam',
    param: 'panningModulationDepth',
    min: 0,
    max: 1,
  },
  {
    id: 'subOscVolume',
    label: 'Sub Oscillator 1 Volume',
    group: 'Mixer',
    defaultCC: 16,
    type: 'synthParam',
    param: 'subOscillatorVolume',
    min: 0,
    max: 1,
  },
  {
    id: 'oscillator2Volume',
    label: 'Oscillator 2 Volume',
    group: 'Mixer',
    defaultCC: 17,
    type: 'synthParam',
    param: 'oscillator2Volume',
    min: 0,
    max: 1,
  },
  {
    id: 'subOsc2Volume',
    label: 'Sub Oscillator 2 Volume',
    group: 'Mixer',
    defaultCC: 18,
    type: 'synthParam',
    param: 'subOscillator2Volume',
    min: 0,
    max: 1,
  },
  {
    id: 'noiseVolume',
    label: 'Noise Volume',
    group: 'Mixer',
    defaultCC: 19,
    type: 'synthParam',
    param: 'noiseVolume',
    min: 0,
    max: 1,
  },
  {
    id: 'sustain',
    label: 'Sustain Pedal',
    group: 'Performance',
    defaultCC: 64,
    type: 'sustain',
    threshold: 64,
  },
  {
    id: 'filterResonance',
    label: 'Filter Resonance',
    group: 'Filter',
    defaultCC: 71,
    type: 'synthParam',
    param: 'filterResonance',
    min: 0,
    max: 0.95,
  },
  {
    id: 'filterEnvRelease',
    label: 'Filter Env Release',
    group: 'Filter',
    defaultCC: 72,
    type: 'synthParam',
    param: 'filterEnvRelease',
    min: 0,
    max: 6,
  },
  {
    id: 'ampEnvAttack',
    label: 'Amp Env Attack',
    group: 'Envelope',
    defaultCC: 73,
    type: 'synthParam',
    param: 'envelopeAttack',
    min: 0,
    max: 6,
  },
  {
    id: 'filterCutoff',
    label: 'Filter Cutoff',
    group: 'Filter',
    defaultCC: 74,
    type: 'synthParam',
    param: 'filterCutoff',
    min: 20,
    max: 20000,
    scaling: 'exponential',
  },
  {
    id: 'filterEnvAttack',
    label: 'Filter Env Attack',
    group: 'Filter',
    defaultCC: 75,
    type: 'synthParam',
    param: 'filterEnvAttack',
    min: 0,
    max: 6,
  },
  {
    id: 'filterEnvDecay',
    label: 'Filter Env Decay',
    group: 'Filter',
    defaultCC: 76,
    type: 'synthParam',
    param: 'filterEnvDecay',
    min: 0,
    max: 6,
  },
  {
    id: 'filterEnvSustain',
    label: 'Filter Env Sustain',
    group: 'Filter',
    defaultCC: 77,
    type: 'synthParam',
    param: 'filterEnvSustain',
    min: 0,
    max: 1,
  },
  {
    id: 'ampEnvDecay',
    label: 'Amp Env Decay',
    group: 'Envelope',
    defaultCC: 80,
    type: 'synthParam',
    param: 'envelopeDecay',
    min: 0,
    max: 6,
  },
  {
    id: 'ampEnvSustain',
    label: 'Amp Env Sustain',
    group: 'Envelope',
    defaultCC: 81,
    type: 'synthParam',
    param: 'envelopeSustain',
    min: 0,
    max: 1,
  },
  {
    id: 'ampEnvRelease',
    label: 'Amp Env Release',
    group: 'Envelope',
    defaultCC: 82,
    type: 'synthParam',
    param: 'envelopeRelease',
    min: 0,
    max: 6,
  },
  {
    id: 'reverbMix',
    label: 'Reverb Mix',
    group: 'FX',
    defaultCC: 91,
    type: 'fxParam',
    effectType: 'reverb',
    param: 'mix',
    min: 0,
    max: 1,
  },
  {
    id: 'chorusMix',
    label: 'Chorus Mix',
    group: 'FX',
    defaultCC: 93,
    type: 'fxParam',
    effectType: 'chorus',
    param: 'mix',
    min: 0,
    max: 1,
  },
  {
    id: 'delayMix',
    label: 'Delay Mix',
    group: 'FX',
    defaultCC: 94,
    type: 'fxParam',
    effectType: 'delay',
    param: 'mix',
    min: 0,
    max: 1,
  },
  {
    id: 'hpfCutoff',
    label: 'HPF Cutoff',
    group: 'Filter',
    defaultCC: 102,
    type: 'synthParam',
    param: 'hpfCutoff',
    min: 20,
    max: 20000,
    scaling: 'exponential',
  },
  {
    id: 'panicAllSoundOff',
    label: 'All Sound Off',
    group: 'Utility',
    defaultCC: 120,
    type: 'panic',
    mode: 'allSoundOff',
  },
  {
    id: 'panicAllNotesOff',
    label: 'All Notes Off',
    group: 'Utility',
    defaultCC: 123,
    type: 'panic',
    mode: 'allNotesOff',
  },
];

const CC_TARGET_MAP = new Map(CC_TARGETS.map((target) => [target.id, target]));

const isBrowserEnv =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function safeHasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export class MIDIInput {
  constructor(synth) {
    this.synth = synth;
    this.midiAccess = null;
    this.enabledInputs = new Map(); // id -> enabled state
    this.onDeviceChange = null; // callback for UI updates
    this.onNoteActivity = null; // callback for note activity display
    this.onMappingChange = null; // callback when CC mappings change
    this.pitchBendRange = 2; // semitones (±2 by default)
    this.velocityCurve = 0; // -100 to 100 (0 = linear)

    // Sustain pedal state
    this.sustainPedal = false;
    this.sustainedNotes = new Set(); // MIDI notes held by sustain pedal

    // CC mapping state
    this.ccTargets = CC_TARGETS;
    this.ccTargetMap = CC_TARGET_MAP;
    this.targetAssignments = new Map(); // targetId -> ccNumber|null
    this.ccAssignments = new Map(); // ccNumber -> targetId
    this.midiLearn = null; // { targetId, callback }

    this.restoreMappings();
  }

  restoreMappings() {
    this.targetAssignments.clear();
    this.ccAssignments.clear();

    const saved = this.loadCustomAssignments();

    for (const target of this.ccTargets) {
      let assigned = undefined;
      if (saved && safeHasOwn(saved, target.id)) {
        assigned = saved[target.id];
      } else {
        assigned = target.defaultCC;
      }
      this.assignTargetInternal(target.id, assigned);
    }
  }

  loadCustomAssignments() {
    if (!isBrowserEnv) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (err) {
      logger.warn('Failed to load MIDI CC mappings from storage:', err);
      return null;
    }
  }

  persistAssignments() {
    if (!isBrowserEnv) {
      return;
    }

    const payload = {};
    for (const target of this.ccTargets) {
      const assigned = this.targetAssignments.get(target.id);
      if (assigned === undefined) continue;
      if (assigned === target.defaultCC) continue;
      if (assigned === null) {
        payload[target.id] = null;
      } else {
        payload[target.id] = assigned;
      }
    }

    try {
      const keys = Object.keys(payload);
      if (keys.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (err) {
      logger.warn('Failed to persist MIDI CC mappings:', err);
    }
  }

  notifyMappingChange() {
    if (typeof this.onMappingChange === 'function') {
      this.onMappingChange(this.getMappingsSnapshot());
    }
  }

  assignTargetInternal(targetId, ccNumber) {
    const normalized =
      ccNumber === null || ccNumber === undefined
        ? null
        : Number.parseInt(ccNumber, 10);

    const prev = this.targetAssignments.get(targetId);
    if (prev !== undefined) {
      this.ccAssignments.delete(prev);
    }

    if (normalized === null || Number.isNaN(normalized)) {
      this.targetAssignments.set(targetId, null);
      return;
    }

    if (normalized < 0 || normalized > 127) {
      logger.warn(
        `Ignoring invalid CC assignment for ${targetId}: ${normalized}`
      );
      this.targetAssignments.set(targetId, null);
      return;
    }

    const conflictingTarget = this.ccAssignments.get(normalized);
    if (conflictingTarget) {
      this.targetAssignments.set(conflictingTarget, null);
    }

    this.targetAssignments.set(targetId, normalized);
    this.ccAssignments.set(normalized, targetId);
  }

  assignTarget(targetId, ccNumber) {
    this.assignTargetInternal(targetId, ccNumber);
    this.persistAssignments();
    this.notifyMappingChange();
  }

  setCCMapping(targetId, ccNumber) {
    if (!this.ccTargetMap.has(targetId)) {
      logger.warn(`Unknown CC mapping target: ${targetId}`);
      return;
    }
    if (ccNumber === '' || ccNumber === null || ccNumber === undefined) {
      this.assignTarget(targetId, null);
      return;
    }
    const normalized = Number.parseInt(ccNumber, 10);
    if (Number.isNaN(normalized)) {
      logger.warn(`Invalid CC number for target ${targetId}: ${ccNumber}`);
      return;
    }
    this.assignTarget(targetId, normalized);
  }

  resetCCMappings() {
    this.restoreMappings();
    this.persistAssignments();
    this.notifyMappingChange();
  }

  startMidiLearn(targetId, callback) {
    if (!this.ccTargetMap.has(targetId)) {
      logger.warn(`Cannot start MIDI learn for unknown target: ${targetId}`);
      return false;
    }
    this.midiLearn = { targetId, callback };
    return true;
  }

  cancelMidiLearn() {
    this.midiLearn = null;
  }

  getMappingsSnapshot() {
    return this.ccTargets.map((target) => ({
      id: target.id,
      label: target.label,
      group: target.group,
      defaultCC: target.defaultCC,
      cc: this.targetAssignments.get(target.id) ?? null,
      type: target.type,
    }));
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      logger.warn('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      logger.debug('Requesting MIDI access');
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      logger.init('MIDI access granted');

      // Listen for new MIDI devices
      this.midiAccess.onstatechange = (e) => {
        logger.info('MIDI device state changed:', e.port.name, e.port.state);

        // Handle device disconnection
        if (e.port.state === 'disconnected' && e.port.type === 'input') {
          if (this.enabledInputs.has(e.port.id)) {
            this.enabledInputs.delete(e.port.id);
            logger.warn(`MIDI device disconnected: ${e.port.name}`);
          }
        }

        this.updateInputs();
        if (this.onDeviceChange) this.onDeviceChange();
      };

      this.updateInputs();
      return true;
    } catch (err) {
      logger.error('Failed to get MIDI access:', err);
      return false;
    }
  }

  updateInputs() {
    if (!this.midiAccess) return;

    // Auto-enable newly connected devices
    for (const input of this.midiAccess.inputs.values()) {
      if (!this.enabledInputs.has(input.id)) {
        this.enabledInputs.set(input.id, true);
        this.connectInput(input);
        logger.info('MIDI input connected:', input.name);
      }
    }
  }

  connectInput(input) {
    input.onmidimessage = (msg) => {
      // Only handle if input is enabled and connected
      if (input.state === 'connected' && this.enabledInputs.get(input.id)) {
        this.handleMIDIMessage(msg, input.id);
      }
    };
  }

  // Apply velocity curve: -100=log, 0=linear, 100=exp
  applyVelocityCurve(velocity) {
    // velocity is 0-127
    const normalized = velocity / 127;

    if (this.velocityCurve === 0) {
      // Linear (no curve)
      return normalized;
    } else if (this.velocityCurve < 0) {
      // Logarithmic (softer, more sensitive at low velocities)
      // Map -100 to 0 → curve factor 0 to 1
      const curveFactor = Math.abs(this.velocityCurve) / 100;
      // Use power curve: x^(1-factor) makes it more log-like
      return Math.pow(normalized, 1 - curveFactor * 0.5);
    } else {
      // Exponential (harder, less sensitive at low velocities)
      // Map 0 to 100 → curve factor 0 to 1
      const curveFactor = this.velocityCurve / 100;
      // Use power curve: x^(1+factor) makes it more exp-like
      return Math.pow(normalized, 1 + curveFactor * 2);
    }
  }

  handleMIDIMessage(message, inputId) {
    const [status, data1, data2] = message.data;
    const command = status & 0xf0;

    // Validate MIDI note range early
    if ((command === 0x90 || command === 0x80) && (data1 < 0 || data1 > 127)) {
      console.warn(`Invalid MIDI note received: ${data1} (must be 0-127)`);
      return;
    }

    switch (command) {
      case 0x90: // Note On
        if (data2 > 0) {
          // Apply velocity curve and convert to 0-1
          const curvedVel = this.applyVelocityCurve(data2);
          // Remove from sustained notes if re-triggered
          this.sustainedNotes.delete(data1);
          this.synth.noteOn(data1, curvedVel);
          if (this.onNoteActivity) {
            this.onNoteActivity('on', data1, data2);
          }
        } else {
          // Note On with velocity 0 is treated as Note Off
          this.handleNoteOff(data1);
        }
        break;

      case 0x80: // Note Off
        this.handleNoteOff(data1);
        break;

      case 0xe0: // Pitch Bend
        // MIDI pitch bend: 14-bit value (0-16383), center = 8192
        // Combine data1 (LSB) and data2 (MSB)
        const pitchBendValue = data1 | (data2 << 7);
        // Normalize to -1 to +1
        const pitchBendNormalized = (pitchBendValue - 8192) / 8192;
        // Apply pitch bend range
        const pitchBendSemitones = pitchBendNormalized * this.pitchBendRange;
        this.synth.setParam('pitchBend', pitchBendSemitones);
        break;

      case 0xd0: // Channel Pressure (Aftertouch)
        // data1 is the pressure value (0-127)
        this.synth.aftertouch(data1);
        break;

      case 0xb0: // Control Change (CC)
        this.handleCC(data1, data2);
        break;
    }
  }

  // Handle note off with sustain pedal support
  handleNoteOff(midiNote) {
    if (this.sustainPedal) {
      // Hold the note until sustain is released
      this.sustainedNotes.add(midiNote);
    } else {
      this.synth.noteOff(midiNote);
    }
    if (this.onNoteActivity) {
      this.onNoteActivity('off', midiNote, 0);
    }
  }

  scaleCCValue(value, target) {
    const normalized = value / 127;
    const min = target.min ?? 0;
    const max = target.max ?? 1;

    if (target.scaling === 'exponential') {
      if (min <= 0 || max <= 0) {
        return min; // avoid invalid calculations
      }
      return min * Math.pow(max / min, normalized);
    }

    return min + normalized * (max - min);
  }

  handleCC(ccNumber, value) {
    logger.debug(`MIDI CC: ${ccNumber} = ${value}`);

    if (this.midiLearn) {
      const { targetId, callback } = this.midiLearn;
      this.midiLearn = null;
      this.assignTarget(targetId, ccNumber);
      if (typeof callback === 'function') {
        callback({ targetId, ccNumber });
      }
    }

    const targetId = this.ccAssignments.get(ccNumber);
    if (!targetId) {
      // Ignore unmapped CCs
      return;
    }

    const target = this.ccTargetMap.get(targetId);
    if (!target) {
      return;
    }

    switch (target.type) {
      case 'synthParam': {
        const scaled = this.scaleCCValue(value, target);
        this.synth.setParam(target.param, scaled);
        break;
      }

      case 'fxParam': {
        if (this.synth.fxController) {
          const fxState = this.synth.fxController.getEffectState(
            target.effectType
          );
          if (fxState && fxState.enabled) {
            const scaled = this.scaleCCValue(value, target);
            this.synth.fxController.setEffectParam(
              target.effectType,
              target.param,
              scaled
            );
          }
        }
        break;
      }

      case 'sustain': {
        const threshold = target.threshold ?? 64;
        const sustainPressed = value >= threshold;
        if (this.sustainPedal && !sustainPressed) {
          // Release all sustained notes
          for (const note of this.sustainedNotes) {
            this.synth.noteOff(note);
          }
          this.sustainedNotes.clear();
        }
        this.sustainPedal = sustainPressed;
        logger.debug(`Sustain pedal: ${sustainPressed ? 'ON' : 'OFF'}`);
        break;
      }

      case 'panic': {
        if (target.mode === 'allSoundOff') {
          logger.info('MIDI Panic: All Sound Off (CC 120)');
          this.synth.allNotesOff();
          this.sustainedNotes.clear();
          this.sustainPedal = false;
        } else if (target.mode === 'allNotesOff') {
          logger.info('MIDI Panic: All Notes Off (CC 123)');
          this.synth.allNotesOff();
          this.sustainedNotes.clear();
        }
        break;
      }

      default:
        break;
    }
  }

  setPitchBendRange(range) {
    this.pitchBendRange = Math.max(0, Math.min(24, range));
    this.synth.setParam('pitchBendRange', this.pitchBendRange);
  }

  setVelocityCurve(curve) {
    this.velocityCurve = Math.max(-100, Math.min(100, curve));
  }

  setInputEnabled(id, enabled) {
    this.enabledInputs.set(id, enabled);
    logger.debug(`MIDI input ${id} ${enabled ? 'enabled' : 'disabled'}`);
  }

  isInputEnabled(id) {
    return this.enabledInputs.get(id) ?? false;
  }

  getAvailableInputs() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.inputs.values())
      .filter((input) => input.state === 'connected')
      .map((input) => ({
        id: input.id,
        name: input.name,
        manufacturer: input.manufacturer,
        state: input.state,
        enabled: this.enabledInputs.get(input.id) ?? false,
      }));
  }
}
