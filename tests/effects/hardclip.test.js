/**
 * Hard Clip Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Hard Clip Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { HardClipEffect } = await import('../../fx/effects/hardclip.js');
      const metadata = HardClipEffect.getMetadata();

      assert.strictEqual(metadata.id, 'hardclip');
      assert.strictEqual(metadata.name, 'Hard Clip');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have drive parameter', async () => {
      const { HardClipEffect } = await import('../../fx/effects/hardclip.js');
      const metadata = HardClipEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'drive');
      assert.ok(param, 'drive parameter should exist');
      assert.strictEqual(param.name, 'drive');
      assert.strictEqual(param.min, 1);
      assert.strictEqual(param.max, 20);
      assert.strictEqual(param.default, 1);
      assert.strictEqual(param.unit, 'x');
    });

    it('should have threshold parameter', async () => {
      const { HardClipEffect } = await import('../../fx/effects/hardclip.js');
      const metadata = HardClipEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'threshold');
      assert.ok(param, 'threshold parameter should exist');
      assert.strictEqual(param.name, 'threshold');
      assert.strictEqual(param.min, 0.1);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.5);
    });

    it('should have mix parameter', async () => {
      const { HardClipEffect } = await import('../../fx/effects/hardclip.js');
      const metadata = HardClipEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.5);
    });

    it('should have exactly 3 parameters', async () => {
      const { HardClipEffect } = await import('../../fx/effects/hardclip.js');
      const metadata = HardClipEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 3);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { HardClipEffect } = await import('../../fx/effects/hardclip.js');
      const metadata = HardClipEffect.getMetadata();

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
