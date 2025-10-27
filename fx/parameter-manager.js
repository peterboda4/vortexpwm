/**
 * Parameter Manager - Centralized parameter validation and management
 *
 * Provides:
 * - Type checking (number, boolean, enum)
 * - Range validation (min/max clamping)
 * - Default value management
 * - Unit conversion helpers
 * - Change notification system
 * - Parameter presets
 */

export class ParameterManager {
  constructor() {
    // Parameter definitions by effect ID
    this.parameters = new Map();

    // Current values by instanceId -> paramName -> value
    this.values = new Map();

    // Change listeners by instanceId
    this.listeners = new Map();

    // Presets by effect ID -> preset name -> parameter values
    this.presets = new Map();
  }

  /**
   * Register effect parameters from metadata
   * @param {string} effectId - Effect identifier
   * @param {Array} parameterDefs - Array of parameter definitions from getMetadata()
   */
  registerEffect(effectId, parameterDefs) {
    const paramMap = new Map();

    for (const param of parameterDefs) {
      // Validate parameter definition
      if (!param.name || typeof param.name !== 'string') {
        throw new Error(
          `Invalid parameter definition for ${effectId}: missing name`
        );
      }

      if (param.min === undefined || param.max === undefined) {
        throw new Error(
          `Invalid parameter ${param.name} for ${effectId}: min/max required`
        );
      }

      // Normalize parameter definition
      paramMap.set(param.name, {
        name: param.name,
        label: param.label || param.name,
        min: param.min,
        max: param.max,
        default: param.default ?? (param.min + param.max) / 2,
        step: param.step ?? null,
        unit: param.unit ?? '',
        type: param.type ?? 'number',
        enum: param.enum ?? null,
      });
    }

    this.parameters.set(effectId, paramMap);
  }

  /**
   * Get parameter definition
   * @param {string} effectId - Effect identifier
   * @param {string} paramName - Parameter name
   * @returns {Object|null} - Parameter definition
   */
  getParameterDef(effectId, paramName) {
    const effectParams = this.parameters.get(effectId);
    if (!effectParams) return null;
    return effectParams.get(paramName) || null;
  }

  /**
   * Get all parameters for an effect
   * @param {string} effectId - Effect identifier
   * @returns {Map|null} - Map of parameter definitions
   */
  getEffectParameters(effectId) {
    return this.parameters.get(effectId) || null;
  }

  /**
   * Validate and clamp parameter value
   * @param {string} effectId - Effect identifier
   * @param {string} paramName - Parameter name
   * @param {*} value - Value to validate
   * @returns {*} - Validated and clamped value
   */
  validateValue(effectId, paramName, value) {
    const paramDef = this.getParameterDef(effectId, paramName);
    if (!paramDef) {
      // This warning can appear during initialization before effects are registered
      // or after effect removal. It's non-critical as the value is passed through.
      // Commenting out to reduce console noise - uncomment for debugging.
      // console.warn(
      //   `Parameter ${paramName} not found for effect ${effectId}, passing through value`
      // );
      return value;
    }

    // Type checking
    if (paramDef.type === 'boolean') {
      return Boolean(value);
    }

    if (paramDef.type === 'enum') {
      if (paramDef.enum && paramDef.enum.includes(value)) {
        return value;
      }
      return paramDef.default;
    }

    if (paramDef.type === 'number') {
      // Convert to number
      const numValue = Number(value);
      if (isNaN(numValue)) {
        console.warn(
          `Invalid number value for ${effectId}.${paramName}: ${value}, using default`
        );
        return paramDef.default;
      }

      // Clamp to min/max
      let clamped = Math.max(paramDef.min, Math.min(paramDef.max, numValue));

      // Apply step quantization if specified
      if (paramDef.step !== null) {
        clamped = Math.round(clamped / paramDef.step) * paramDef.step;
      }

      return clamped;
    }

    // Unknown type - pass through
    return value;
  }

  /**
   * Set parameter value with validation
   * @param {string} instanceId - Effect instance ID
   * @param {string} effectId - Effect type ID
   * @param {string} paramName - Parameter name
   * @param {*} value - New value
   * @returns {*} - Validated value that was set
   */
  setValue(instanceId, effectId, paramName, value) {
    const validatedValue = this.validateValue(effectId, paramName, value);

    // Initialize instance values map if needed
    if (!this.values.has(instanceId)) {
      this.values.set(instanceId, new Map());
    }

    const instanceValues = this.values.get(instanceId);
    const oldValue = instanceValues.get(paramName);

    // Set new value
    instanceValues.set(paramName, validatedValue);

    // Notify listeners if value changed
    if (oldValue !== validatedValue) {
      this.notifyListeners(instanceId, paramName, validatedValue, oldValue);
    }

    return validatedValue;
  }

  /**
   * Get parameter value
   * @param {string} instanceId - Effect instance ID
   * @param {string} effectId - Effect type ID
   * @param {string} paramName - Parameter name
   * @returns {*} - Current value or default
   */
  getValue(instanceId, effectId, paramName) {
    const instanceValues = this.values.get(instanceId);
    if (!instanceValues || !instanceValues.has(paramName)) {
      // Return default value
      const paramDef = this.getParameterDef(effectId, paramName);
      return paramDef ? paramDef.default : null;
    }
    return instanceValues.get(paramName);
  }

  /**
   * Get all values for an instance
   * @param {string} instanceId - Effect instance ID
   * @returns {Map} - Map of parameter values
   */
  getAllValues(instanceId) {
    return this.values.get(instanceId) || new Map();
  }

  /**
   * Reset parameter to default value
   * @param {string} instanceId - Effect instance ID
   * @param {string} effectId - Effect type ID
   * @param {string} paramName - Parameter name
   */
  resetToDefault(instanceId, effectId, paramName) {
    const paramDef = this.getParameterDef(effectId, paramName);
    if (paramDef) {
      this.setValue(instanceId, effectId, paramName, paramDef.default);
    }
  }

  /**
   * Reset all parameters for an instance
   * @param {string} instanceId - Effect instance ID
   * @param {string} effectId - Effect type ID
   */
  resetAllToDefaults(instanceId, effectId) {
    const effectParams = this.getEffectParameters(effectId);
    if (!effectParams) return;

    for (const [paramName, paramDef] of effectParams) {
      this.setValue(instanceId, effectId, paramName, paramDef.default);
    }
  }

  /**
   * Clear instance values
   * @param {string} instanceId - Effect instance ID
   */
  clearInstance(instanceId) {
    this.values.delete(instanceId);
    this.listeners.delete(instanceId);
  }

  /**
   * Add change listener for instance
   * @param {string} instanceId - Effect instance ID
   * @param {Function} callback - (paramName, newValue, oldValue) => void
   * @returns {Function} - Unsubscribe function
   */
  addListener(instanceId, callback) {
    if (!this.listeners.has(instanceId)) {
      this.listeners.set(instanceId, []);
    }

    const listeners = this.listeners.get(instanceId);
    listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners for an instance
   * @private
   */
  notifyListeners(instanceId, paramName, newValue, oldValue) {
    const listeners = this.listeners.get(instanceId);
    if (!listeners) return;

    for (const callback of listeners) {
      try {
        callback(paramName, newValue, oldValue);
      } catch (err) {
        console.error('Error in parameter change listener:', err);
      }
    }
  }

  /**
   * Register a preset
   * @param {string} effectId - Effect type ID
   * @param {string} presetName - Preset name
   * @param {Object} values - Parameter values
   */
  registerPreset(effectId, presetName, values) {
    if (!this.presets.has(effectId)) {
      this.presets.set(effectId, new Map());
    }

    this.presets.get(effectId).set(presetName, values);
  }

  /**
   * Load preset for an instance
   * @param {string} instanceId - Effect instance ID
   * @param {string} effectId - Effect type ID
   * @param {string} presetName - Preset name
   * @returns {boolean} - Success
   */
  loadPreset(instanceId, effectId, presetName) {
    const effectPresets = this.presets.get(effectId);
    if (!effectPresets) return false;

    const presetValues = effectPresets.get(presetName);
    if (!presetValues) return false;

    // Apply all preset values
    for (const [paramName, value] of Object.entries(presetValues)) {
      this.setValue(instanceId, effectId, paramName, value);
    }

    return true;
  }

  /**
   * Get all presets for an effect
   * @param {string} effectId - Effect type ID
   * @returns {Array<string>} - Preset names
   */
  getPresets(effectId) {
    const effectPresets = this.presets.get(effectId);
    if (!effectPresets) return [];
    return Array.from(effectPresets.keys());
  }

  /**
   * Convert normalized value (0-1) to parameter range
   * @param {string} effectId - Effect type ID
   * @param {string} paramName - Parameter name
   * @param {number} normalized - Normalized value (0-1)
   * @returns {number} - Value in parameter range
   */
  fromNormalized(effectId, paramName, normalized) {
    const paramDef = this.getParameterDef(effectId, paramName);
    if (!paramDef) return normalized;

    const range = paramDef.max - paramDef.min;
    const value = paramDef.min + normalized * range;

    // Apply step if specified
    if (paramDef.step !== null) {
      return Math.round(value / paramDef.step) * paramDef.step;
    }

    return value;
  }

  /**
   * Convert parameter value to normalized (0-1)
   * @param {string} effectId - Effect type ID
   * @param {string} paramName - Parameter name
   * @param {number} value - Value in parameter range
   * @returns {number} - Normalized value (0-1)
   */
  toNormalized(effectId, paramName, value) {
    const paramDef = this.getParameterDef(effectId, paramName);
    if (!paramDef) return value;

    const range = paramDef.max - paramDef.min;
    return (value - paramDef.min) / range;
  }

  /**
   * Format parameter value for display
   * @param {string} effectId - Effect type ID
   * @param {string} paramName - Parameter name
   * @param {*} value - Parameter value
   * @returns {string} - Formatted string
   */
  formatValue(effectId, paramName, value) {
    const paramDef = this.getParameterDef(effectId, paramName);
    if (!paramDef) return String(value);

    if (paramDef.type === 'boolean') {
      return value ? 'On' : 'Off';
    }

    if (paramDef.type === 'enum') {
      return String(value);
    }

    // Number formatting
    let formatted = value.toFixed(paramDef.step !== null ? 0 : 2);

    // Add unit
    if (paramDef.unit) {
      formatted += ' ' + paramDef.unit;
    }

    return formatted;
  }
}

// Export singleton instance
export const parameterManager = new ParameterManager();
