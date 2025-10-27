/**
 * Chorus Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Chorus Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

      assert.strictEqual(metadata.id, 'chorus');
      assert.strictEqual(metadata.name, 'Chorus');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have rate parameter', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'rate');
      assert.ok(param, 'rate parameter should exist');
      assert.strictEqual(param.name, 'rate');
      assert.strictEqual(param.min, 0.1);
      assert.strictEqual(param.max, 5);
      assert.strictEqual(param.default, 0.5);
      assert.strictEqual(param.unit, 'Hz');
    });

    it('should have depth parameter', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'depth');
      assert.ok(param, 'depth parameter should exist');
      assert.strictEqual(param.name, 'depth');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.7);
    });

    it('should have delay parameter', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'delay');
      assert.ok(param, 'delay parameter should exist');
      assert.strictEqual(param.name, 'delay');
      assert.strictEqual(param.min, 5);
      assert.strictEqual(param.max, 50);
      assert.strictEqual(param.default, 20);
      assert.strictEqual(param.unit, 'ms');
    });

    it('should have mix parameter', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.2);
    });

    it('should have exactly 4 parameters', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 4);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { ChorusEffect } = await import('../../fx/effects/chorus.js');
      const metadata = ChorusEffect.getMetadata();

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
