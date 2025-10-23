// midi/midi-input.js - Web MIDI API integration
export class MIDIInput {
  constructor(synth) {
    this.synth = synth;
    this.midiAccess = null;
    this.enabledInputs = new Map(); // id -> enabled state
    this.onDeviceChange = null; // callback for UI updates
    this.onNoteActivity = null; // callback for note activity display
    this.pitchBendRange = 2; // semitones (±2 by default)
    this.velocityCurve = 0; // -100 to 100 (0 = linear)
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      console.log('MIDI Access granted');

      // Listen for new MIDI devices
      this.midiAccess.onstatechange = (e) => {
        console.log('MIDI device state changed:', e.port.name, e.port.state);
        this.updateInputs();
        if (this.onDeviceChange) this.onDeviceChange();
      };

      this.updateInputs();
      return true;
    } catch (err) {
      console.error('Failed to get MIDI access:', err);
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
        console.log('MIDI input connected:', input.name);
      }
    }
  }

  connectInput(input) {
    input.onmidimessage = (msg) => {
      // Only handle if input is enabled
      if (this.enabledInputs.get(input.id)) {
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

    switch (command) {
      case 0x90: // Note On
        if (data2 > 0) {
          // Apply velocity curve and convert to 0-1
          const curvedVel = this.applyVelocityCurve(data2);
          this.synth.noteOn(data1, curvedVel);
          if (this.onNoteActivity) {
            this.onNoteActivity('on', data1, data2);
          }
        } else {
          // Note On with velocity 0 is treated as Note Off
          this.synth.noteOff(data1);
          if (this.onNoteActivity) {
            this.onNoteActivity('off', data1, 0);
          }
        }
        break;

      case 0x80: // Note Off
        this.synth.noteOff(data1);
        if (this.onNoteActivity) {
          this.onNoteActivity('off', data1, 0);
        }
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

      // Could add CC (Control Change) support here later
      // case 0xB0:
      //   this.handleCC(data1, data2);
      //   break;
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
    console.log(`MIDI input ${id} ${enabled ? 'enabled' : 'disabled'}`);
  }

  isInputEnabled(id) {
    return this.enabledInputs.get(id) ?? false;
  }

  getAvailableInputs() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer,
      state: input.state,
      enabled: this.enabledInputs.get(input.id) ?? false,
    }));
  }
}
