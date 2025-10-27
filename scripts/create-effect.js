#!/usr/bin/env node

/**
 * Scaffold script for creating new FX effects
 *
 * Usage:
 *   npm run create-effect <effectname>
 *   node scripts/create-effect.js <effectname>
 *
 * Example:
 *   npm run create-effect compressor
 *
 * This will:
 * 1. Create fx/effects/compressor.js with template code
 * 2. Add entry to fx/effect-registry.js
 * 3. Print next steps for the developer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get effect name from command line
const effectName = process.argv[2];

if (!effectName) {
  console.error('Usage: npm run create-effect <effectname>');
  console.error('Example: npm run create-effect compressor');
  process.exit(1);
}

// Validate effect name (lowercase, alphanumeric only)
if (!/^[a-z][a-z0-9]*$/.test(effectName)) {
  console.error(
    'Error: Effect name must be lowercase alphanumeric (e.g., "compressor", "eq3band")'
  );
  process.exit(1);
}

// Generate class name (PascalCase + "Effect" suffix)
const className =
  effectName.charAt(0).toUpperCase() + effectName.slice(1) + 'Effect';

// File paths
const effectsDir = path.join(__dirname, '../fx/effects');
const effectFilePath = path.join(effectsDir, `${effectName}.js`);
const registryPath = path.join(__dirname, '../fx/effect-registry.js');

// Check if effect already exists
if (fs.existsSync(effectFilePath)) {
  console.error(
    `Error: Effect "${effectName}" already exists at ${effectFilePath}`
  );
  process.exit(1);
}

// Template for new effect
const effectTemplate = `import { FXBase } from '../fx-base.js';

/**
 * ${className} - [Your effect description here]
 *
 * TODO: Describe what this effect does
 */
export class ${className} extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // TODO: Initialize effect state and buffers here
    // Example:
    // this.bufferSize = 1024;
    // this.bufferL = new Float32Array(this.bufferSize);
    // this.bufferR = new Float32Array(this.bufferSize);

    // Default parameters
    this.param1 = 0.5;
    this.param2 = 1.0;
    // TODO: Add more parameters
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // TODO: Implement your DSP algorithm here
    // Process the audio and return [outputL, outputR]

    // Example passthrough:
    return [inputL, inputR];
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'param1':
        this.param1 = Math.max(0, Math.min(1, value));
        break;
      case 'param2':
        this.param2 = Math.max(0.1, Math.min(10, value));
        break;
      // TODO: Add more parameter handlers
    }
  }

  reset() {
    // TODO: Reset effect state (clear buffers, reset phase, etc.)
    // Example:
    // this.bufferL.fill(0);
    // this.bufferR.fill(0);
  }

  static getMetadata() {
    return {
      id: '${effectName}',
      name: '${className.replace('Effect', '')}',
      parameters: [
        {
          name: 'param1',
          label: 'Param 1',
          min: 0,
          max: 1,
          default: 0.5,
        },
        {
          name: 'param2',
          label: 'Param 2',
          min: 0.1,
          max: 10,
          default: 1.0,
        },
        // TODO: Add more parameters
      ],
    };
  }
}
`;

// Write effect file
console.log(`Creating new effect: ${effectName}`);
console.log(`File: ${effectFilePath}`);
fs.writeFileSync(effectFilePath, effectTemplate, 'utf8');
console.log('✓ Effect file created');

// Update effect registry
console.log('\\nUpdating effect registry...');
let registryCode = fs.readFileSync(registryPath, 'utf8');

// Find the EFFECT_REGISTRY array
const registryMatch = registryCode.match(
  /(export const EFFECT_REGISTRY = \[)([\s\S]*?)(\];)/
);
if (!registryMatch) {
  console.error('Error: Could not parse EFFECT_REGISTRY');
  process.exit(1);
}

// Create new registry entry
const newEntry = `  {
    id: '${effectName}',
    file: '${effectName}.js',
    class: '${className}',
    description: 'TODO: Add effect description',
  },`;

// Insert before the closing bracket
const [, opening, existing, closing] = registryMatch;
const updatedRegistry = `${opening}${existing}${newEntry}\\n${closing}`;

registryCode = registryCode.replace(registryMatch[0], updatedRegistry);
fs.writeFileSync(registryPath, registryCode, 'utf8');
console.log('✓ Registry updated');

// Success message with next steps
console.log('\\n✅ Effect scaffolding complete!');
console.log('\\nNext steps:');
console.log(`1. Open fx/effects/${effectName}.js`);
console.log('2. Implement your DSP algorithm in the process() method');
console.log('3. Add/modify parameters in getMetadata()');
console.log('4. Update parameter handling in onParameterChange()');
console.log('5. Implement reset() to clear effect state');
console.log(`6. Update the description in fx/effect-registry.js`);
console.log('\\n7. Test your effect:');
console.log('   - Open index.html in a browser');
console.log('   - Add your effect to the FX chain');
console.log('   - Verify audio processing works correctly');
console.log('\\n8. Build and validate:');
console.log('   npm run build');
console.log('\\n9. Document your effect in doc/FX_README.md');
console.log(
  '\\nThe effect is now automatically registered and will be available in:'
);
console.log('  - FX Controller (main thread)');
console.log('  - Build process (validation)');
console.log('  - FX Chain Processor (worklet) - requires manual addition');
console.log(
  '\\nNote: You still need to manually add the effect class to worklet/fx-chain-processor.js'
);
console.log('      (Search for "class HardClipEffect" to see the pattern)');
