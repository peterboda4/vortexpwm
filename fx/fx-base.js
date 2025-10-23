/**
 * Base class for all stereo effects
 * Each effect processes true stereo (independent L/R channels)
 */
export class FXBase {
  constructor(sampleRate, id) {
    this.sampleRate = sampleRate;
    this.id = id;
    this.enabled = true;
    this.parameters = new Map();
  }

  /**
   * Process one stereo frame
   * @param {number} inputL - Left channel input sample
   * @param {number} inputR - Right channel input sample
   * @returns {[number, number]} - [outputL, outputR]
   */
  process(inputL, inputR) {
    throw new Error('process() must be implemented by subclass');
  }

  /**
   * Set parameter value
   * @param {string} name - Parameter name
   * @param {number} value - Parameter value
   */
  setParameter(name, value) {
    this.parameters.set(name, value);
    this.onParameterChange(name, value);
  }

  /**
   * Override to handle parameter changes
   */
  onParameterChange(name, value) {}

  /**
   * Reset internal state (on stop/clear)
   */
  reset() {}

  /**
   * Get effect metadata (static method to override)
   */
  static getMetadata() {
    return {
      id: 'base',
      name: 'Base Effect',
      parameters: [],
    };
  }
}
