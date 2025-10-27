/**
 * Pitch Shifter Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Pitch Shifter Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

      assert.strictEqual(metadata.id, 'pitchshifter');
      assert.strictEqual(metadata.name, 'Pitch Shifter');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have coarse parameter', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'coarse');
      assert.ok(param, 'coarse parameter should exist');
      assert.strictEqual(param.name, 'coarse');
      assert.strictEqual(param.min, -24);
      assert.strictEqual(param.max, 24);
      assert.strictEqual(param.default, 0);
      assert.strictEqual(param.unit, 'st');
    });

    it('should have fine parameter', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'fine');
      assert.ok(param, 'fine parameter should exist');
      assert.strictEqual(param.name, 'fine');
      assert.strictEqual(param.min, -50);
      assert.strictEqual(param.max, 50);
      assert.strictEqual(param.default, 0);
      assert.strictEqual(param.unit, 'ct');
    });

    it('should have dry parameter', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'dry');
      assert.ok(param, 'dry parameter should exist');
      assert.strictEqual(param.name, 'dry');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 1);
    });

    it('should have wet parameter', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'wet');
      assert.ok(param, 'wet parameter should exist');
      assert.strictEqual(param.name, 'wet');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0);
    });

    it('should have exactly 4 parameters', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 4);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { PitchShifterEffect } = await import(
        '../../fx/effects/pitchshifter.js'
      );
      const metadata = PitchShifterEffect.getMetadata();

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
