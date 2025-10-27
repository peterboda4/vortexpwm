/**
 * Phaser Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Phaser Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { PhaserEffect } = await import('../../fx/effects/phaser.js');
      const metadata = PhaserEffect.getMetadata();

      assert.strictEqual(metadata.id, 'phaser');
      assert.strictEqual(metadata.name, 'Phaser');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have all required parameters', async () => {
      const { PhaserEffect } = await import('../../fx/effects/phaser.js');
      const metadata = PhaserEffect.getMetadata();

      const expectedParams = ['rate', 'depth', 'feedback', 'mix'];
      for (const paramName of expectedParams) {
        const param = metadata.parameters.find((p) => p.name === paramName);
        assert.ok(param, `${paramName} parameter should exist`);
        assert.strictEqual(typeof param.min, 'number');
        assert.strictEqual(typeof param.max, 'number');
        assert.strictEqual(typeof param.default, 'number');
      }
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { PhaserEffect } = await import('../../fx/effects/phaser.js');
      const metadata = PhaserEffect.getMetadata();

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
