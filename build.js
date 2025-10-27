#!/usr/bin/env node

/**
 * Build script - Creates single-file monolithic distribution
 *
 * This script bundles the entire PWM synthesizer into a single HTML file (dist/index.html)
 * that can be deployed to any web server supporting HTTPS.
 *
 * ## What it does:
 * 1. Collects all JavaScript modules from the codebase (excluding tests, worklets, build files)
 * 2. Converts ES modules to base64 data URLs to preserve module semantics
 * 3. Patches all relative imports to use data URLs (3-pass iterative algorithm)
 * 4. Inlines CSS directly into HTML
 * 5. Embeds AudioWorklet processors as Blob URLs
 * 6. Pre-loads and globally exposes all FX effect classes
 * 7. Validates the final output for completeness
 *
 * ## Three-pass patching system:
 * The build uses an iterative approach to handle nested imports:
 * - Pass 1: Read all original module code
 * - Pass 2: First round of patching (creates initial data URLs)
 * - Pass 3: Iterative re-patching (up to 4 iterations) until convergence
 *
 * This ensures all nested imports are correctly resolved to data URLs.
 *
 * ## Debug mode:
 * Run with BUILD_DEBUG=1 to see detailed patching information:
 * ```bash
 * BUILD_DEBUG=1 npm run build
 * ```
 *
 * ## Output:
 * - File: dist/index.html (~984KB with source maps, ~426KB without)
 * - Format: Single-file monolithic distribution
 * - Contents: Complete synth + 11 effects + UI + MIDI support + inline source maps
 * - Requirements: HTTPS or localhost (AudioWorklet API requirement)
 * - Source Maps: Inline base64-encoded for all modules and worklets (enables debugging)
 *
 * @author PWM Synth Team
 * @license MIT
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

// Helper to generate inline source map for a module
function generateSourceMap(originalPath, code) {
  // Create a simple source map that maps the bundled code back to original file
  const sourceMap = {
    version: 3,
    file: path.basename(originalPath),
    sources: [originalPath],
    sourcesContent: [code],
    names: [],
    mappings: '', // Empty mappings = identity mapping (line-by-line)
  };

  // Convert source map to base64 data URL
  const sourceMapJson = JSON.stringify(sourceMap);
  const sourceMapBase64 = Buffer.from(sourceMapJson).toString('base64');
  return `data:application/json;charset=utf-8;base64,${sourceMapBase64}`;
}

// Helper to convert file to data URL with optional source map
function toDataURL(code, type = 'application/javascript', sourceMapUrl = null) {
  // Add source map comment if provided
  if (sourceMapUrl) {
    code = code + `\n//# sourceMappingURL=${sourceMapUrl}`;
  }
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
    this.effectsMetadata.set('pitchshifter', window.PitchShifterEffect.getMetadata());

    this.metadataLoaded = true;
  }`
    );
  }

  return code;
}

// Automatically collect all JS modules
function collectModules(dir, basePath = '') {
  const modules = [];
  const entries = fs.readdirSync(path.join(__dirname, dir), {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // Skip certain directories
      if (
        ['node_modules', 'dist', '.git', 'tests', 'worklet'].includes(
          entry.name
        )
      ) {
        continue;
      }
      // Recursively collect from subdirectories
      modules.push(...collectModules(path.join(dir, entry.name), relativePath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.js') &&
      !entry.name.endsWith('.test.js')
    ) {
      modules.push(relativePath);
    }
  }

  return modules;
}

const modulePaths = collectModules('.')
  .filter((p) => {
    // Exclude test files and build scripts
    return !p.includes('build.js') && !p.endsWith('.test.js');
  })
  .sort(); // Sort for deterministic builds

console.log(`Collected ${modulePaths.length} modules:`, modulePaths);

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

// Pass 2: First round of patching - creates initial data URLs with source maps
console.log('Pass 2: First patch pass...');
for (const modulePath of modulePaths) {
  const fullPath = path.join(__dirname, modulePath);
  const code = originalCode.get(fullPath);
  const patched = patchModuleFromCode(fullPath, code, moduleMap, {
    pass: 'pass2',
    modulePath,
  });
  patchedCode.set(fullPath, patched);

  // Generate source map for this module
  const sourceMapUrl = generateSourceMap(modulePath, code);
  moduleMap.set(
    fullPath,
    toDataURL(patched, 'application/javascript', sourceMapUrl)
  );
}

// Pass 3: Second patch pass - re-patch with updated data URLs and source maps
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

    // Generate source map for this module
    const sourceMapUrl = generateSourceMap(modulePath, code);
    const newDataUrl = toDataURL(
      finalPatched,
      'application/javascript',
      sourceMapUrl
    );

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
  console.warn(
    '[build] Warning: pass3 reached max iterations without convergence'
  );
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

// Validate that all modules were successfully converted to data URLs
const missingModules = [];
for (const modulePath of modulePaths) {
  const fullPath = path.join(__dirname, modulePath);
  if (!moduleMap.has(fullPath)) {
    missingModules.push(modulePath);
  }
}

if (missingModules.length > 0) {
  console.error('❌ Build validation failed: Missing modules in moduleMap:');
  missingModules.forEach((m) => console.error(`  - ${m}`));
  process.exit(1);
}

console.log('✓ All modules validated in moduleMap');

// Read worklet files
const workletSynthProcessor = fs.readFileSync(
  path.join(__dirname, 'worklet/synth-processor.js'),
  'utf-8'
);
const workletFxChainProcessor = fs.readFileSync(
  path.join(__dirname, 'worklet/fx-chain-processor.js'),
  'utf-8'
);

// Validate that worklet processors are self-contained (no imports)
function validateWorkletProcessor(code, filename) {
  // Check for ES6 import statements
  const importRegex = /^\s*import\s+/m;
  if (importRegex.test(code)) {
    console.error(
      `❌ Build validation failed: ${filename} contains import statements`
    );
    console.error(
      '   AudioWorklet processors must be self-contained (no imports allowed)'
    );
    const matches = code.match(/^\s*import\s+.+$/gm);
    if (matches) {
      console.error('   Found imports:');
      matches.forEach((match) => console.error(`     ${match.trim()}`));
    }
    process.exit(1);
  }

  // Check for dynamic imports
  const dynamicImportRegex = /import\s*\(/;
  if (dynamicImportRegex.test(code)) {
    console.error(
      `❌ Build validation failed: ${filename} contains dynamic import() calls`
    );
    console.error(
      '   AudioWorklet processors must be self-contained (no dynamic imports)'
    );
    process.exit(1);
  }

  // Check for require() calls (CommonJS)
  const requireRegex = /\brequire\s*\(/;
  if (requireRegex.test(code)) {
    console.error(
      `❌ Build validation failed: ${filename} contains require() calls`
    );
    console.error(
      '   AudioWorklet processors must be self-contained (no require)'
    );
    process.exit(1);
  }
}

console.log('Validating worklet processors...');
validateWorkletProcessor(workletSynthProcessor, 'synth-processor.js');
validateWorkletProcessor(workletFxChainProcessor, 'fx-chain-processor.js');
console.log('✓ Worklet processors are self-contained (no imports)');

// Get the patched main.js data URL
const mainJsPath = path.join(__dirname, 'main.js');
const mainJsDataUrl = moduleMap.get(mainJsPath);

if (!mainJsDataUrl) {
  console.error('❌ Build validation failed: main.js data URL not found');
  process.exit(1);
}

// Validate required effect modules using registry
// Import effect registry dynamically
const effectRegistryPath = path.join(__dirname, 'fx/effect-registry.js');
const effectRegistryCode = fs.readFileSync(effectRegistryPath, 'utf8');

// Extract EFFECT_REGISTRY array using regex (simple parsing)
const registryMatch = effectRegistryCode.match(
  /export const EFFECT_REGISTRY = \[([\s\S]*?)\];/
);
if (!registryMatch) {
  console.error('❌ Could not parse EFFECT_REGISTRY from effect-registry.js');
  process.exit(1);
}

// Parse effect files from registry
const effectFilesInRegistry = [];
const fileMatches = registryMatch[1].matchAll(/file:\s*['"]([^'"]+)['"]/g);
for (const match of fileMatches) {
  effectFilesInRegistry.push(`fx/effects/${match[1]}`);
}

for (const effect of effectFilesInRegistry) {
  const effectPath = path.join(__dirname, effect);
  if (!moduleMap.has(effectPath)) {
    console.error(
      `❌ Build validation failed: Required effect ${effect} not found`
    );
    process.exit(1);
  }
}

console.log(
  `✓ All ${effectFilesInRegistry.length} required effects validated (from registry)`
);

// Create worklet setup code
const workletSetup = `
// Check for secure context (required for AudioWorklet)
if (!window.isSecureContext) {
  console.error('[Build] ERROR: Not in secure context. AudioWorklet requires HTTPS or localhost.');
  console.error('[Build] Current location:', window.location.href);
  alert('This synthesizer requires HTTPS or localhost to function. Please access via a web server.');
}

// Create Blob URLs for AudioWorklet processors with source maps
const synthProcessorSourceMap = ${JSON.stringify(generateSourceMap('worklet/synth-processor.js', workletSynthProcessor))};
const fxChainProcessorSourceMap = ${JSON.stringify(generateSourceMap('worklet/fx-chain-processor.js', workletFxChainProcessor))};

const synthProcessorCode = \`${workletSynthProcessor.replace(/[`\\$]/g, '\\$&')}
//# sourceMappingURL=\${synthProcessorSourceMap}\`;

const fxChainProcessorCode = \`${workletFxChainProcessor.replace(/[`\\$]/g, '\\$&')}
//# sourceMappingURL=\${fxChainProcessorSourceMap}\`;

window.__workletURLs = {
  'synth-processor': URL.createObjectURL(
    new Blob([synthProcessorCode], { type: 'application/javascript' })
  ),
  'fx-chain-processor': URL.createObjectURL(
    new Blob([fxChainProcessorCode], { type: 'application/javascript' })
  )
};

// Import and expose effect classes globally for FX controller
// Automatically generated from effect registry
${(() => {
  // Generate import array from registry
  const imports = effectFilesInRegistry
    .map((file) => {
      const fullPath = path.join(__dirname, file);
      const dataUrl = moduleMap.get(fullPath);
      return `import('${dataUrl}')`;
    })
    .join(',\n  ');

  // Extract class names and IDs from registry for assignment
  const classNames = [];
  const idMatches = registryMatch[1].matchAll(
    /\{\s*id:\s*['"]([^'"]+)['"],[^}]*class:\s*['"]([^'"]+)['"]/gs
  );
  for (const match of idMatches) {
    classNames.push({ id: match[1], class: match[2] });
  }

  // Generate variable names for destructuring
  const varNames = classNames.map((_, i) => `effect${i}`).join(', ');

  // Generate assignments
  const assignments = classNames
    .map((cn, i) => `window.${cn.class} = effect${i}.${cn.class};`)
    .join('\n  ');

  return `Promise.all([
  ${imports}
]).then(([${varNames}]) => {
  // Make effect classes globally available (auto-generated from registry)
  ${assignments}

  // Now load main module
  import('${mainJsDataUrl}');
}).catch(err => {
  console.error('[Build] Failed to load effect classes:', err);
});`;
})()}
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

// Validate final HTML before writing
if (!finalHtml.includes('__workletURLs')) {
  console.error(
    '❌ Build validation failed: Worklet setup code not found in final HTML'
  );
  process.exit(1);
}

if (!finalHtml.includes('data:application/javascript;base64,')) {
  console.error('❌ Build validation failed: No data URLs found in final HTML');
  process.exit(1);
}

// Check that CSS was inlined
if (finalHtml.includes('link rel="stylesheet"')) {
  console.error('❌ Build validation failed: CSS not properly inlined');
  process.exit(1);
}

// Check that main.js script tag was replaced
if (finalHtml.includes('src="./main.js"')) {
  console.error(
    '❌ Build validation failed: main.js script not replaced with inline code'
  );
  process.exit(1);
}

console.log('✓ Final HTML validated');

// Count source maps in output (decode data URLs to check)
let sourceMapCount = 0;
const dataUrls =
  finalHtml.match(/data:application\/javascript;base64,([A-Za-z0-9+\/=]+)/g) ||
  [];
for (const dataUrl of dataUrls) {
  const base64 = dataUrl.split(',')[1];
  const decoded = Buffer.from(base64, 'base64').toString();
  if (decoded.includes('sourceMappingURL=')) {
    sourceMapCount++;
  }
}
console.log(
  `✓ Inline source maps generated: ${sourceMapCount} data URLs with source maps`
);

// Write final HTML
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), finalHtml);

// Verify file was written
if (!fs.existsSync(path.join(__dirname, 'dist/index.html'))) {
  console.error('❌ Build validation failed: dist/index.html was not created');
  process.exit(1);
}

const fileSizeKB = (finalHtml.length / 1024).toFixed(1);
console.log('✅ Build complete: dist/index.html');
console.log(`📦 File size: ${fileSizeKB} KB`);
console.log('📝 Single-file monolithic distribution with:');
console.log('   • Inline CSS');
console.log('   • ES modules as data URLs (base64)');
console.log('   • AudioWorklet processors as Blob URLs');
console.log('   • 11 audio effects included');
console.log('   • Full MIDI, keyboard, and FX chain support');
console.log(`   • Inline source maps (${sourceMapCount} total) for debugging`);
console.log('✓ All build validations passed');
