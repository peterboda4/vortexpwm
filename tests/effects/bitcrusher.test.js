/**
 * BitCrusher Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('BitCrusher Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { BitCrusherEffect } = await import(
        '../../fx/effects/bitcrusher.js'
      );
      const metadata = BitCrusherEffect.getMetadata();

      assert.strictEqual(metadata.id, 'bitcrusher');
      assert.strictEqual(metadata.name, 'Bit Crusher');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have bitDepth parameter', async () => {
      const { BitCrusherEffect } = await import(
        '../../fx/effects/bitcrusher.js'
      );
      const metadata = BitCrusherEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'bitDepth');
      assert.ok(param, 'bitDepth parameter should exist');
      assert.strictEqual(param.name, 'bitDepth');
      assert.strictEqual(param.min, 2);
      assert.strictEqual(param.max, 16);
      assert.strictEqual(param.default, 16);
      assert.strictEqual(param.unit, 'bit');
    });

    it('should have sampleRateReduction parameter', async () => {
      const { BitCrusherEffect } = await import(
        '../../fx/effects/bitcrusher.js'
      );
      const metadata = BitCrusherEffect.getMetadata();

      const param = metadata.parameters.find(
        (p) => p.name === 'sampleRateReduction'
      );
      assert.ok(param, 'sampleRateReduction parameter should exist');
      assert.strictEqual(param.name, 'sampleRateReduction');
      assert.strictEqual(param.min, 1);
      assert.strictEqual(param.max, 50);
      assert.strictEqual(param.default, 1);
      assert.strictEqual(param.unit, 'x');
    });

    it('should have mix parameter', async () => {
      const { BitCrusherEffect } = await import(
        '../../fx/effects/bitcrusher.js'
      );
      const metadata = BitCrusherEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 1);
    });

    it('should have exactly 3 parameters', async () => {
      const { BitCrusherEffect } = await import(
        '../../fx/effects/bitcrusher.js'
      );
      const metadata = BitCrusherEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 3);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { BitCrusherEffect } = await import(
        '../../fx/effects/bitcrusher.js'
      );
      const metadata = BitCrusherEffect.getMetadata();

      for (const param of metadata.parameters) {
        assert.ok(param.name, 'Parameter should have name');
        assert.strictEqual(
          typeof param.min,
          'number',
          `${param.name} should have numeric min`
        );
        assert.strictEqual(
          typeof param.max,
          'number',
          `${param.name} should have numeric max`
        );
        assert.ok(
          param.min < param.max,
          `${param.name} min should be less than max`
        );
        assert.ok(
          param.default >= param.min && param.default <= param.max,
          `${param.name} default should be within range`
        );
      }
    });
  });
});
