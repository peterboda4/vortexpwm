/**
 * Stereo Delay Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Stereo Delay Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      assert.strictEqual(metadata.id, 'delay');
      assert.strictEqual(metadata.name, 'Stereo Delay');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have delayTimeL parameter', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'delayTimeL');
      assert.ok(param, 'delayTimeL parameter should exist');
      assert.strictEqual(param.name, 'delayTimeL');
      assert.strictEqual(param.min, 0.001);
      assert.strictEqual(param.max, 2);
      assert.strictEqual(param.default, 0.25);
      assert.strictEqual(param.unit, 's');
    });

    it('should have delayTimeR parameter', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'delayTimeR');
      assert.ok(param, 'delayTimeR parameter should exist');
      assert.strictEqual(param.name, 'delayTimeR');
      assert.strictEqual(param.min, 0.001);
      assert.strictEqual(param.max, 2);
      assert.strictEqual(param.default, 0.375);
      assert.strictEqual(param.unit, 's');
    });

    it('should have feedback parameter', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'feedback');
      assert.ok(param, 'feedback parameter should exist');
      assert.strictEqual(param.name, 'feedback');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 0.95);
      assert.strictEqual(param.default, 0.3);
    });

    it('should have crossFeedback parameter', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'crossFeedback');
      assert.ok(param, 'crossFeedback parameter should exist');
      assert.strictEqual(param.name, 'crossFeedback');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 0.5);
      assert.strictEqual(param.default, 0);
    });

    it('should have mix parameter', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.3);
    });

    it('should have exactly 5 parameters', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 5);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const metadata = DelayEffect.getMetadata();

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
