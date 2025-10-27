/**
 * Freq Shifter Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Freq Shifter Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { FreqShifterEffect } = await import(
        '../../fx/effects/freqshifter.js'
      );
      const metadata = FreqShifterEffect.getMetadata();

      assert.strictEqual(metadata.id, 'freqshifter');
      assert.strictEqual(metadata.name, 'Freq Shifter');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have shift parameter', async () => {
      const { FreqShifterEffect } = await import(
        '../../fx/effects/freqshifter.js'
      );
      const metadata = FreqShifterEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'shift');
      assert.ok(param, 'shift parameter should exist');
      assert.strictEqual(param.name, 'shift');
      assert.strictEqual(param.min, -500);
      assert.strictEqual(param.max, 500);
      assert.strictEqual(param.default, 100);
      assert.strictEqual(param.unit, 'Hz');
    });

    it('should have mix parameter', async () => {
      const { FreqShifterEffect } = await import(
        '../../fx/effects/freqshifter.js'
      );
      const metadata = FreqShifterEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.5);
    });

    it('should have exactly 2 parameters', async () => {
      const { FreqShifterEffect } = await import(
        '../../fx/effects/freqshifter.js'
      );
      const metadata = FreqShifterEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 2);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { FreqShifterEffect } = await import(
        '../../fx/effects/freqshifter.js'
      );
      const metadata = FreqShifterEffect.getMetadata();

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
