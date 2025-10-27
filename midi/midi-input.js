// midi/midi-input.js - Web MIDI API integration
import { logger } from '../utils/logger.js';

export class MIDIInput {
  constructor(synth) {
    this.synth = synth;
    this.midiAccess = null;
    this.enabledInputs = new Map(); // id -> enabled state
    this.onDeviceChange = null; // callback for UI updates
    this.onNoteActivity = null; // callback for note activity display
    this.pitchBendRange = 2; // semitones (±2 by default)
    this.velocityCurve = 0; // -100 to 100 (0 = linear)

    // Sustain pedal state
    this.sustainPedal = false;
    this.sustainedNotes = new Set(); // MIDI notes held by sustain pedal
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

  // Map MIDI CC value (0-127) to parameter range
  mapCC(value, min, max, exponential = false) {
    const normalized = value / 127;
    if (exponential) {
      // Exponential scaling for filter frequencies (20Hz - 20kHz)
      return min * Math.pow(max / min, normalized);
    }
    return min + normalized * (max - min);
  }

  // Handle MIDI CC messages
  handleCC(ccNumber, value) {
    logger.debug(`MIDI CC: ${ccNumber} = ${value}`);

    switch (ccNumber) {
      // Modulation Wheel → PWM Depth
      case 1:
        this.synth.setParam('pulseWidthModulationDepth', this.mapCC(value, 0, 1));
        break;

      // Volume → Master Volume
      case 7:
        this.synth.setParam('masterVolume', this.mapCC(value, 0, 1));
        break;

      // Pan → Pan Position
      case 10:
        this.synth.setParam('panningPosition', this.mapCC(value, -1, 1));
        break;

      // Expression → Oscillator Volume
      case 11:
        this.synth.setParam('oscillatorVolume', this.mapCC(value, 0, 1));
        break;

      // Effect Control 1 → PWM Rate
      case 12:
        this.synth.setParam('pulseWidthModulationRate', this.mapCC(value, 0.1, 10));
        break;

      // Effect Control 2 → Pan Depth
      case 13:
        this.synth.setParam('panningModulationDepth', this.mapCC(value, 0, 1));
        break;

      // General Purpose 1 → Sub Osc 1 Volume
      case 16:
        this.synth.setParam('subOscillatorVolume', this.mapCC(value, 0, 1));
        break;

      // General Purpose 2 → Osc 2 Volume
      case 17:
        this.synth.setParam('oscillator2Volume', this.mapCC(value, 0, 1));
        break;

      // General Purpose 3 → Sub Osc 2 Volume
      case 18:
        this.synth.setParam('subOscillator2Volume', this.mapCC(value, 0, 1));
        break;

      // General Purpose 4 → Noise Volume
      case 19:
        this.synth.setParam('noiseVolume', this.mapCC(value, 0, 1));
        break;

      // Sustain Pedal
      case 64:
        const sustainPressed = value >= 64;
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

      // MIDI Panic: All Sound Off (CC 120)
      case 120:
        logger.info('MIDI Panic: All Sound Off (CC 120)');
        this.synth.allNotesOff();
        this.sustainedNotes.clear();
        this.sustainPedal = false;
        break;

      // MIDI Panic: All Notes Off (CC 123)
      case 123:
        logger.info('MIDI Panic: All Notes Off (CC 123)');
        this.synth.allNotesOff();
        this.sustainedNotes.clear();
        break;

      // Resonance (Filter Q) → LPF Resonance
      case 71:
        this.synth.setParam('filterResonance', this.mapCC(value, 0, 0.95));
        break;

      // Sound Controller 3 (Release) → Filter Release
      case 72:
        this.synth.setParam('filterEnvRelease', this.mapCC(value, 0, 6));
        break;

      // Attack Time → Amp Envelope Attack
      case 73:
        this.synth.setParam('envelopeAttack', this.mapCC(value, 0, 6));
        break;

      // Brightness (Filter Cutoff) → LPF Cutoff
      case 74:
        this.synth.setParam(
          'filterCutoff',
          this.mapCC(value, 20, 20000, true)
        );
        break;

      // Sound Controller 6 → Filter Attack
      case 75:
        this.synth.setParam('filterEnvAttack', this.mapCC(value, 0, 6));
        break;

      // Sound Controller 7 → Filter Decay
      case 76:
        this.synth.setParam('filterEnvDecay', this.mapCC(value, 0, 6));
        break;

      // Sound Controller 8 → Filter Sustain
      case 77:
        this.synth.setParam('filterEnvSustain', this.mapCC(value, 0, 1));
        break;

      // General Purpose 5 → Amp Envelope Decay
      case 80:
        this.synth.setParam('envelopeDecay', this.mapCC(value, 0, 6));
        break;

      // General Purpose 6 → Amp Envelope Sustain
      case 81:
        this.synth.setParam('envelopeSustain', this.mapCC(value, 0, 1));
        break;

      // General Purpose 7 → Amp Envelope Release
      case 82:
        this.synth.setParam('envelopeRelease', this.mapCC(value, 0, 6));
        break;

      // Effects Level (Reverb) → Reverb Mix (if FX available)
      case 91:
        if (this.synth.fxController) {
          const fxState = this.synth.fxController.getEffectState('reverb');
          if (fxState && fxState.enabled) {
            this.synth.fxController.setEffectParam(
              'reverb',
              'mix',
              this.mapCC(value, 0, 1)
            );
          }
        }
        break;

      // Effects Depth (Chorus) → Chorus Mix (if FX available)
      case 93:
        if (this.synth.fxController) {
          const fxState = this.synth.fxController.getEffectState('chorus');
          if (fxState && fxState.enabled) {
            this.synth.fxController.setEffectParam(
              'chorus',
              'mix',
              this.mapCC(value, 0, 1)
            );
          }
        }
        break;

      // Effects Depth (Delay) → Delay Mix (if FX available)
      case 94:
        if (this.synth.fxController) {
          const fxState = this.synth.fxController.getEffectState('delay');
          if (fxState && fxState.enabled) {
            this.synth.fxController.setEffectParam(
              'delay',
              'mix',
              this.mapCC(value, 0, 1)
            );
          }
        }
        break;

      // Effect 1 Depth → HPF Cutoff
      case 102:
        this.synth.setParam('hpfCutoff', this.mapCC(value, 20, 20000, true));
        break;

      default:
        // Ignore unmapped CCs
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
