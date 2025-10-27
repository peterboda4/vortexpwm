/**
 * Generate Effect Tests
 * Automatically generates test files for all effects based on their metadata
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Effects to generate tests for
const effectsToGenerate = [
  { id: 'delay', file: 'delay.js', class: 'DelayEffect' },
  { id: 'tremolo', file: 'tremolo.js', class: 'TremoloEffect' },
  { id: 'autowah', file: 'autowah.js', class: 'AutoWahEffect' },
  { id: 'freqshifter', file: 'freqshifter.js', class: 'FreqShifterEffect' },
  { id: 'pitchshifter', file: 'pitchshifter.js', class: 'PitchShifterEffect' },
  { id: 'hardclip', file: 'hardclip.js', class: 'HardClipEffect' },
];

async function generateTestFile(effectInfo) {
  const { id, file, class: className } = effectInfo;

  // Import the effect to get metadata
  const effectPath = path.join(projectRoot, 'fx', 'effects', file);
  const module = await import(effectPath);
  const EffectClass = module[className];
  const metadata = EffectClass.getMetadata();

  // Generate test content
  const testContent = `/**
 * ${metadata.name} Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('${metadata.name} Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { ${className} } = await import('../../fx/effects/${file}');
      const metadata = ${className}.getMetadata();

      assert.strictEqual(metadata.id, '${metadata.id}');
      assert.strictEqual(metadata.name, '${metadata.name}');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
${metadata.parameters.map((param) => generateParameterTest(className, file, param)).join('\n\n')}

    it('should have exactly ${metadata.parameters.length} parameters', async () => {
      const { ${className} } = await import('../../fx/effects/${file}');
      const metadata = ${className}.getMetadata();

      assert.strictEqual(metadata.parameters.length, ${metadata.parameters.length});
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { ${className} } = await import('../../fx/effects/${file}');
      const metadata = ${className}.getMetadata();

      for (const param of metadata.parameters) {
        assert.ok(param.name, 'Parameter should have name');
        assert.strictEqual(
          typeof param.min,
          'number',
          \`\${param.name} should have numeric min\`
        );
        assert.strictEqual(
          typeof param.max,
          'number',
          \`\${param.name} should have numeric max\`
        );
        assert.ok(
          param.min < param.max,
          \`\${param.name} min should be less than max\`
        );
        assert.ok(
          param.default >= param.min && param.default <= param.max,
          \`\${param.name} default should be within range\`
        );
      }
    });
  });
});
`;

  return testContent;
}

function generateParameterTest(className, file, param) {
  const unitCheck = param.unit
    ? `\n      assert.strictEqual(param.unit, '${param.unit}');`
    : '';

  return `    it('should have ${param.name} parameter', async () => {
      const { ${className} } = await import('../../fx/effects/${file}');
      const metadata = ${className}.getMetadata();

      const param = metadata.parameters.find((p) => p.name === '${param.name}');
      assert.ok(param, '${param.name} parameter should exist');
      assert.strictEqual(param.name, '${param.name}');
      assert.strictEqual(param.min, ${param.min});
      assert.strictEqual(param.max, ${param.max});
      assert.strictEqual(param.default, ${param.default});${unitCheck}
    });`;
}

async function main() {
  console.log('Generating effect tests...\n');

  const testsDir = path.join(projectRoot, 'tests', 'effects');

  // Create tests/effects directory if it doesn't exist
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  for (const effectInfo of effectsToGenerate) {
    console.log(`Generating test for ${effectInfo.id}...`);

    try {
      const testContent = await generateTestFile(effectInfo);
      const testPath = path.join(testsDir, `${effectInfo.id}.test.js`);

      fs.writeFileSync(testPath, testContent, 'utf8');
      console.log(`  ✓ Created ${effectInfo.id}.test.js`);
    } catch (error) {
      console.error(
        `  ✗ Error generating ${effectInfo.id}.test.js:`,
        error.message
      );
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
