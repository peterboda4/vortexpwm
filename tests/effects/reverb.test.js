/**
 * Reverb Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Reverb Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

      assert.strictEqual(metadata.id, 'reverb');
      assert.strictEqual(metadata.name, 'Hall/Shimmer');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have size parameter', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'size');
      assert.ok(param, 'size parameter should exist');
      assert.strictEqual(param.name, 'size');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.7);
    });

    it('should have decay parameter', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'decay');
      assert.ok(param, 'decay parameter should exist');
      assert.strictEqual(param.name, 'decay');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 0.99);
      assert.strictEqual(param.default, 0.6);
    });

    it('should have shimmer parameter', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'shimmer');
      assert.ok(param, 'shimmer parameter should exist');
      assert.strictEqual(param.name, 'shimmer');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0);
    });

    it('should have mix parameter', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.2);
    });

    it('should have exactly 4 parameters', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 4);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { ReverbEffect } = await import('../../fx/effects/reverb.js');
      const metadata = ReverbEffect.getMetadata();

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
