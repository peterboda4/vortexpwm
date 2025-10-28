// utils/tempo-manager.js - Centralized tempo/BPM state management

/**
 * TempoManager - Centralized tempo/BPM state management
 *
 * Manages global BPM setting for tempo-synced features like LFO and effects.
 * Supports manual BPM setting and prepares for future MIDI Clock sync.
 *
 * @class
 * @example
 * const tempoManager = new TempoManager();
 * tempoManager.setBPM(140);
 * tempoManager.onChange = (bpm, source) => {
 *   console.log(`BPM changed to ${bpm} (source: ${source})`);
 * };
 */
export class TempoManager {
  /**
   * Create a TempoManager instance
   * @param {number} [initialBPM=120] - Initial BPM value (20-300)
   */
  constructor(initialBPM = 120) {
    this._bpm = this._clampBPM(initialBPM);
    this._source = 'manual'; // 'manual' | 'midi' (future MIDI Clock support)
    this.onChange = null; // Callback: (bpm, source) => void
  }

  /**
   * Clamp BPM value to valid range (20-300)
   * @private
   * @param {number} bpm - BPM value to clamp
   * @returns {number} Clamped BPM value
   */
  _clampBPM(bpm) {
    return Math.max(20, Math.min(300, bpm));
  }

  /**
   * Set BPM value
   * @param {number} bpm - BPM value (20-300, will be clamped)
   * @param {string} [source='manual'] - Source of BPM change ('manual' | 'midi')
   */
  setBPM(bpm, source = 'manual') {
    const clampedBPM = this._clampBPM(bpm);
    const changed = clampedBPM !== this._bpm || source !== this._source;

    this._bpm = clampedBPM;
    this._source = source;

    if (changed && typeof this.onChange === 'function') {
      this.onChange(this._bpm, this._source);
    }
  }

  /**
   * Get current BPM value
   * @returns {number} Current BPM (20-300)
   */
  getBPM() {
    return this._bpm;
  }

  /**
   * Get current BPM source
   * @returns {string} 'manual' or 'midi'
   */
  getSource() {
    return this._source;
  }

  /**
   * Reset BPM to default value (120)
   * @param {string} [source='manual'] - Source of reset
   */
  reset(source = 'manual') {
    this.setBPM(120, source);
  }

  /**
   * Check if BPM value is valid
   * @param {number} bpm - BPM value to validate
   * @returns {boolean} True if BPM is within valid range (20-300)
   */
  isValidBPM(bpm) {
    return typeof bpm === 'number' && bpm >= 20 && bpm <= 300;
  }
}
