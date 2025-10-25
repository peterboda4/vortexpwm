#!/usr/bin/env node

/**
 * Build script - Creates single-file distribution
 * Uses data URLs (base64) for all modules to preserve ES module semantics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DEBUG = process.env.BUILD_DEBUG === '1';
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[build:debug]', ...args);
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read HTML and CSS
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');

// Helper to convert file to data URL
function toDataURL(code, type = 'application/javascript') {
  return `data:${type};base64,${Buffer.from(code).toString('base64')}`;
}

// Helper to patch imports in module code
function patchModuleFromCode(filePath, code, moduleMap, options = {}) {
  const { pass = 'unknown', modulePath = 'unknown' } = options;

  // Replace relative imports with data URLs
  code = code.replace(/from\s+['"](\..+?)['"]/g, (match, importPath) => {
    // Resolve the import path relative to the current file
    let resolvedPath = path.resolve(path.dirname(filePath), importPath);

    // Try with .js extension if not present
    if (!resolvedPath.endsWith('.js')) {
      resolvedPath = resolvedPath + '.js';
    }

    const dataUrl = moduleMap.get(resolvedPath);
    if (dataUrl) {
      debugLog(
        `[${pass}] patched static import`,
        `${modulePath} -> ${importPath}`,
        `(${resolvedPath})`
      );
      // console.log(`✓ Resolved ${importPath} → data URL (from ${path.basename(filePath)})`);
      return `from '${dataUrl}'`;
    }

    // Uncomment for debugging:
    // console.warn(`✗ Could not resolve import "${importPath}" from ${path.basename(filePath)}`);
    // console.warn(`  Tried: ${resolvedPath}`);
    return match;
  });

  // Replace import() calls with data URLs
  code = code.replace(
    /import\s*\(\s*['"](\..+?)['"]\s*\)/g,
    (match, importPath) => {
      // Resolve the import path relative to the current file
      let resolvedPath = path.resolve(path.dirname(filePath), importPath);

      // Try with .js extension if not present
      if (!resolvedPath.endsWith('.js')) {
        resolvedPath = resolvedPath + '.js';
      }

      const dataUrl = moduleMap.get(resolvedPath);
      if (dataUrl) {
        debugLog(
          `[${pass}] patched dynamic import`,
          `${modulePath} -> ${importPath}`,
          `(${resolvedPath})`
        );
        return `import('${dataUrl}')`;
      }

      const hasKey = moduleMap.has(resolvedPath);
      debugLog(
        `[${pass}] dynamic import unresolved`,
        `${modulePath} -> ${importPath}`,
        `(${resolvedPath})`,
        `mapHas=${hasKey}`
      );
      console.warn(
        `Warning: Could not resolve dynamic import "${importPath}" from ${filePath}`
      );
      return match;
    }
  );

  // Replace worklet addModule paths with Blob URLs
  code = code.replace(
    /addModule\s*\(\s*['"](.+?)['"]\s*\)/g,
    (match, workletPath) => {
      if (workletPath.includes('synth-processor.js')) {
        return `addModule(window.__workletURLs['synth-processor'])`;
      }
      if (workletPath.includes('fx-chain-processor.js')) {
        return `addModule(window.__workletURLs['fx-chain-processor'])`;
      }
      return match;
    }
  );

  // Special handling for fx-controller.js - replace dynamic imports with static ones
  if (filePath.includes('fx-controller.js')) {
    // Replace the entire loadMetadata function with inline version
    code = code.replace(
      /async loadMetadata\(\) \{[\s\S]*?\n  \}/,
      `async loadMetadata() {
    // Static imports are already available in monolithic build
    this.effectsMetadata.set('hardclip', window.HardClipEffect.getMetadata());
    this.effectsMetadata.set('phaser', window.PhaserEffect.getMetadata());
    this.effectsMetadata.set('bitcrusher', window.BitCrusherEffect.getMetadata());
    this.effectsMetadata.set('chorus', window.ChorusEffect.getMetadata());
    this.effectsMetadata.set('delay', window.DelayEffect.getMetadata());
    this.effectsMetadata.set('reverb', window.ReverbEffect.getMetadata());
    this.effectsMetadata.set('flanger', window.FlangerEffect.getMetadata());
    this.effectsMetadata.set('tremolo', window.TremoloEffect.getMetadata());
    this.effectsMetadata.set('autowah', window.AutoWahEffect.getMetadata());
    this.effectsMetadata.set('freqshifter', window.FreqShifterEffect.getMetadata());

    this.metadataLoaded = true;
  }`
    );
  }

  return code;
}

// Collect all JS modules
const modulePaths = [
  'main.js',
  'audio/synth.js',
  'midi/midi-input.js',
  'utils/music.js',
  'ui/controls.js',
  'ui/parameter-controls.js',
  'ui/keyboard.js',
  'ui/midi-controls.js',
  'ui/fx-controls.js',
  'fx/fx-controller.js',
  'fx/fx-base.js',
  'fx/effects/hardclip.js',
  'fx/effects/phaser.js',
  'fx/effects/bitcrusher.js',
  'fx/effects/chorus.js',
  'fx/effects/delay.js',
  'fx/effects/reverb.js',
  'fx/effects/flanger.js',
  'fx/effects/tremolo.js',
  'fx/effects/autowah.js',
  'fx/effects/freqshifter.js',
];

// Build process: three-pass patching to handle nested imports
const moduleMap = new Map();
const originalCode = new Map();
const patchedCode = new Map();

// Pass 1: Read all original module code
console.log('Pass 1: Reading modules...');
for (const modulePath of modulePaths) {
  const fullPath = path.join(__dirname, modulePath);
  const code = fs.readFileSync(fullPath, 'utf-8');
  originalCode.set(fullPath, code);
}

// Pass 2: First round of patching - creates initial data URLs
console.log('Pass 2: First patch pass...');
for (const modulePath of modulePaths) {
  const fullPath = path.join(__dirname, modulePath);
  const code = originalCode.get(fullPath);
  const patched = patchModuleFromCode(fullPath, code, moduleMap, {
    pass: 'pass2',
    modulePath,
  });
  patchedCode.set(fullPath, patched);
  moduleMap.set(fullPath, toDataURL(patched));
}

// Pass 3: Second patch pass - re-patch with updated data URLs
console.log('Pass 3: Final patch pass...');
let iteration = 0;
const maxIterations = 4;
while (iteration < maxIterations) {
  let changed = false;
  for (const modulePath of modulePaths) {
    const fullPath = path.join(__dirname, modulePath);
    const code = originalCode.get(fullPath); // Always start from original
    const finalPatched = patchModuleFromCode(fullPath, code, moduleMap, {
      pass: `pass3:${iteration}`,
      modulePath,
    });
    const newDataUrl = toDataURL(finalPatched);
    if (moduleMap.get(fullPath) !== newDataUrl) {
      moduleMap.set(fullPath, newDataUrl);
      changed = true;
      debugLog(`[pass3:${iteration}] module updated`, modulePath);
    }
  }
  iteration += 1;
  if (!changed) {
    debugLog(`[pass3] converged after ${iteration} iteration(s)`);
    break;
  }
  debugLog(`[pass3] iteration ${iteration} completed with changes`);
}
if (iteration === maxIterations && DEBUG) {
  console.warn('[build] Warning: pass3 reached max iterations without convergence');
}

if (DEBUG) {
  const synthPath = path.join(__dirname, 'audio/synth.js');
  const synthDataUrl = moduleMap.get(synthPath);
  if (synthDataUrl) {
    const [, encoded = ''] = synthDataUrl.split(',');
    const decoded = Buffer.from(encoded, 'base64').toString();
    debugLog('[pass3] synth module preview', decoded.slice(0, 200));
  } else {
    debugLog('[pass3] synth module missing from moduleMap');
  }
}

console.log(`✓ Patched ${modulePaths.length} modules`);

// Read worklet files
const workletSynthProcessor = fs.readFileSync(
  path.join(__dirname, 'worklet/synth-processor.js'),
  'utf-8'
);
const workletFxChainProcessor = fs.readFileSync(
  path.join(__dirname, 'worklet/fx-chain-processor.js'),
  'utf-8'
);

// Get the patched main.js data URL
const mainJsPath = path.join(__dirname, 'main.js');
const mainJsDataUrl = moduleMap.get(mainJsPath);

// Create worklet setup code
const workletSetup = `
// Create Blob URLs for AudioWorklet processors
const synthProcessorCode = \`${workletSynthProcessor.replace(/[`\\$]/g, '\\$&')}\`;
const fxChainProcessorCode = \`${workletFxChainProcessor.replace(/[`\\$]/g, '\\$&')}\`;

window.__workletURLs = {
  'synth-processor': URL.createObjectURL(
    new Blob([synthProcessorCode], { type: 'application/javascript' })
  ),
  'fx-chain-processor': URL.createObjectURL(
    new Blob([fxChainProcessorCode], { type: 'application/javascript' })
  )
};

// Import and expose effect classes globally for FX controller
Promise.all([
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/hardclip.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/phaser.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/bitcrusher.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/chorus.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/delay.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/reverb.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/flanger.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/tremolo.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/autowah.js'))}'),
  import('${moduleMap.get(path.join(__dirname, 'fx/effects/freqshifter.js'))}')
]).then(([hardclip, phaser, bitcrusher, chorus, delay, reverb, flanger, tremolo, autowah, freqshifter]) => {
  // Make effect classes globally available
  window.HardClipEffect = hardclip.HardClipEffect;
  window.PhaserEffect = phaser.PhaserEffect;
  window.BitCrusherEffect = bitcrusher.BitCrusherEffect;
  window.ChorusEffect = chorus.ChorusEffect;
  window.DelayEffect = delay.DelayEffect;
  window.ReverbEffect = reverb.ReverbEffect;
  window.FlangerEffect = flanger.FlangerEffect;
  window.TremoloEffect = tremolo.TremoloEffect;
  window.AutoWahEffect = autowah.AutoWahEffect;
  window.FreqShifterEffect = freqshifter.FreqShifterEffect;

  // Now load main module
  import('${mainJsDataUrl}');
}).catch(err => {
  console.error('[Build] Failed to load effect classes:', err);
});
`;

// Build final HTML
let finalHtml = indexHtml;

// Inline CSS
finalHtml = finalHtml.replace(
  /<link rel="stylesheet" href="\.\/styles\.css" \/>/,
  `<style>${css}</style>`
);

// Replace main.js script with inline worklet setup + data URL import
finalHtml = finalHtml.replace(
  /<script type="module" src="\.\/main\.js"><\/script>/,
  `<script type="module">${workletSetup}</script>`
);

// Create dist directory
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'));
}

// Write final HTML
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), finalHtml);

const fileSizeKB = (finalHtml.length / 1024).toFixed(1);
console.log('✅ Build complete: dist/index.html');
console.log(`📦 File size: ${fileSizeKB} KB`);
console.log('📝 Single-file monolithic distribution with:');
console.log('   • Inline CSS');
console.log('   • ES modules as data URLs (base64)');
console.log('   • AudioWorklet processors as Blob URLs');
console.log('   • 10 audio effects included');
console.log('   • Full MIDI, keyboard, and FX chain support');
