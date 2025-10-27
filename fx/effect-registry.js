/**
 * Effect Registry - Automatic effect discovery and registration
 *
 * This module automatically discovers all effects in fx/effects/ directory
 * and provides metadata for registration in various contexts:
 * - fx-controller.js (main thread)
 * - build.js (build-time validation)
 * - fx-chain-processor.js (worklet)
 */

/**
 * Effect registry metadata
 * All effects are automatically discovered from fx/effects/ directory
 *
 * Format:
 * {
 *   id: 'effectname',
 *   file: 'effectname.js',
 *   class: 'EffectNameEffect',
 *   description: 'Short description'
 * }
 */
export const EFFECT_REGISTRY = [
  {
    id: 'hardclip',
    file: 'hardclip.js',
    class: 'HardClipEffect',
    description: 'Hard clipping distortion with drive and threshold',
  },
  {
    id: 'phaser',
    file: 'phaser.js',
    class: 'PhaserEffect',
    description: '4-stage all-pass phaser with LFO modulation',
  },
  {
    id: 'bitcrusher',
    file: 'bitcrusher.js',
    class: 'BitCrusherEffect',
    description: 'Lo-fi bit depth and sample rate reduction',
  },
  {
    id: 'chorus',
    file: 'chorus.js',
    class: 'ChorusEffect',
    description: 'Stereo chorus with 2 voices per channel',
  },
  {
    id: 'delay',
    file: 'delay.js',
    class: 'DelayEffect',
    description: 'Stereo delay with cross-feedback',
  },
  {
    id: 'reverb',
    file: 'reverb.js',
    class: 'ReverbEffect',
    description: 'Freeverb algorithm with 8 comb + 4 allpass filters',
  },
  {
    id: 'flanger',
    file: 'flanger.js',
    class: 'FlangerEffect',
    description: 'Short modulated delay for jet-plane sweep',
  },
  {
    id: 'tremolo',
    file: 'tremolo.js',
    class: 'TremoloEffect',
    description: 'Amplitude modulation with multiple waveforms',
  },
  {
    id: 'autowah',
    file: 'autowah.js',
    class: 'AutoWahEffect',
    description: 'LFO-modulated resonant lowpass filter',
  },
  {
    id: 'freqshifter',
    file: 'freqshifter.js',
    class: 'FreqShifterEffect',
    description: 'Frequency shifter using Hilbert transform',
  },
  {
    id: 'pitchshifter',
    file: 'pitchshifter.js',
    class: 'PitchShifterEffect',
    description: 'Granular pitch shifter with overlapping grains',
  },
];

/**
 * Get effect metadata by ID
 * @param {string} id - Effect ID
 * @returns {Object|null} Effect metadata
 */
export function getEffectInfo(id) {
  return EFFECT_REGISTRY.find((effect) => effect.id === id) || null;
}

/**
 * Get all effect IDs
 * @returns {Array<string>} Array of effect IDs
 */
export function getAllEffectIds() {
  return EFFECT_REGISTRY.map((effect) => effect.id);
}

/**
 * Get all effect file paths
 * @returns {Array<string>} Array of effect file paths
 */
export function getAllEffectFiles() {
  return EFFECT_REGISTRY.map((effect) => `fx/effects/${effect.file}`);
}

/**
 * Generate import statements for all effects
 * Used by fx-controller.js for dynamic loading
 * @returns {Array<string>} Array of import paths
 */
export function getEffectImportPaths() {
  return EFFECT_REGISTRY.map((effect) => `./effects/${effect.file}`);
}

/**
 * Generate effect class names for global exposure
 * Used by build.js
 * @returns {Array<Object>} Array of {id, class} objects
 */
export function getEffectClassNames() {
  return EFFECT_REGISTRY.map((effect) => ({
    id: effect.id,
    class: effect.class,
  }));
}

/**
 * Validate that effect file exists
 * @param {string} effectId - Effect ID
 * @param {Function} fileExistsFn - Function to check if file exists (fs.existsSync)
 * @param {string} basePath - Base path to fx/effects directory
 * @returns {boolean} True if file exists
 */
export function validateEffectFile(effectId, fileExistsFn, basePath) {
  const info = getEffectInfo(effectId);
  if (!info) return false;

  const path = `${basePath}/fx/effects/${info.file}`;
  return fileExistsFn(path);
}
