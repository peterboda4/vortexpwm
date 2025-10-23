#!/usr/bin/env node

/**
 * Build script - Creates single-file distribution
 * Uses data URLs (base64) for all modules to preserve ES module semantics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read HTML and CSS
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');

// Helper to convert file to data URL
function toDataURL(code, type = 'application/javascript') {
  return `data:${type};base64,${Buffer.from(code).toString('base64')}`;
}

// Helper to read and patch imports in a module
function patchModule(filePath, moduleMap) {
  let code = fs.readFileSync(filePath, 'utf-8');

  // Replace relative imports with data URLs
  code = code.replace(/from\s+['"](\..+?)['"]/g, (match, importPath) => {
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const dataUrl = moduleMap.get(resolvedPath);
    if (dataUrl) {
      return `from '${dataUrl}'`;
    }
    return match;
  });

  // Replace import() calls with data URLs
  code = code.replace(
    /import\s*\(\s*['"](\..+?)['"]\s*\)/g,
    (match, importPath) => {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const dataUrl = moduleMap.get(resolvedPath);
      if (dataUrl) {
        return `import('${dataUrl}')`;
      }
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
];

// First pass: create data URLs for all modules
const moduleMap = new Map();
for (const modulePath of modulePaths) {
  const fullPath = path.join(__dirname, modulePath);
  moduleMap.set(fullPath, null); // placeholder
}

// Second pass: patch imports and create data URLs
for (const modulePath of modulePaths) {
  const fullPath = path.join(__dirname, modulePath);
  const patchedCode = patchModule(fullPath, moduleMap);
  const dataUrl = toDataURL(patchedCode);
  moduleMap.set(fullPath, dataUrl);
}

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

// Load main module
import('${mainJsDataUrl}');
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

console.log('✓ Build complete: dist/index.html');
console.log(
  '  Single-file distribution with data URL modules and Blob URL worklets'
);
console.log(
  '  All ES modules preserved, worklets converted to Blob URLs at runtime'
);
