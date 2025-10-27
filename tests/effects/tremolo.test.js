/**
 * Tremolo Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Tremolo Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

      assert.strictEqual(metadata.id, 'tremolo');
      assert.strictEqual(metadata.name, 'Tremolo');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have rate parameter', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'rate');
      assert.ok(param, 'rate parameter should exist');
      assert.strictEqual(param.name, 'rate');
      assert.strictEqual(param.min, 0.1);
      assert.strictEqual(param.max, 20);
      assert.strictEqual(param.default, 4);
      assert.strictEqual(param.unit, 'Hz');
    });

    it('should have depth parameter', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'depth');
      assert.ok(param, 'depth parameter should exist');
      assert.strictEqual(param.name, 'depth');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.7);
    });

    it('should have stereoPhase parameter', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'stereoPhase');
      assert.ok(param, 'stereoPhase parameter should exist');
      assert.strictEqual(param.name, 'stereoPhase');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0);
    });

    it('should have waveform parameter', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'waveform');
      assert.ok(param, 'waveform parameter should exist');
      assert.strictEqual(param.name, 'waveform');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 2);
      assert.strictEqual(param.default, 0);
    });

    it('should have exactly 4 parameters', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 4);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { TremoloEffect } = await import('../../fx/effects/tremolo.js');
      const metadata = TremoloEffect.getMetadata();

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
