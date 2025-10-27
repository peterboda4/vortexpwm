/**
 * Auto-Wah Effect Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Auto-Wah Effect', () => {
  describe('Metadata', () => {
    it('should have valid metadata structure', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      assert.strictEqual(metadata.id, 'autowah');
      assert.strictEqual(metadata.name, 'Auto-Wah');
      assert.ok(Array.isArray(metadata.parameters));
      assert.ok(metadata.parameters.length > 0);
    });
  });

  describe('Parameters', () => {
    it('should have rate parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'rate');
      assert.ok(param, 'rate parameter should exist');
      assert.strictEqual(param.name, 'rate');
      assert.strictEqual(param.min, 0.1);
      assert.strictEqual(param.max, 10);
      assert.strictEqual(param.default, 0.5);
      assert.strictEqual(param.unit, 'Hz');
    });

    it('should have centerFreq parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'centerFreq');
      assert.ok(param, 'centerFreq parameter should exist');
      assert.strictEqual(param.name, 'centerFreq');
      assert.strictEqual(param.min, 200);
      assert.strictEqual(param.max, 5000);
      assert.strictEqual(param.default, 800);
      assert.strictEqual(param.unit, 'Hz');
    });

    it('should have range parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'range');
      assert.ok(param, 'range parameter should exist');
      assert.strictEqual(param.name, 'range');
      assert.strictEqual(param.min, 0.5);
      assert.strictEqual(param.max, 4);
      assert.strictEqual(param.default, 2.5);
      assert.strictEqual(param.unit, 'oct');
    });

    it('should have depth parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'depth');
      assert.ok(param, 'depth parameter should exist');
      assert.strictEqual(param.name, 'depth');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0.8);
    });

    it('should have resonance parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'resonance');
      assert.ok(param, 'resonance parameter should exist');
      assert.strictEqual(param.name, 'resonance');
      assert.strictEqual(param.min, 0.5);
      assert.strictEqual(param.max, 10);
      assert.strictEqual(param.default, 3);
    });

    it('should have waveform parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'waveform');
      assert.ok(param, 'waveform parameter should exist');
      assert.strictEqual(param.name, 'waveform');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 0);
    });

    it('should have mix parameter', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      const param = metadata.parameters.find((p) => p.name === 'mix');
      assert.ok(param, 'mix parameter should exist');
      assert.strictEqual(param.name, 'mix');
      assert.strictEqual(param.min, 0);
      assert.strictEqual(param.max, 1);
      assert.strictEqual(param.default, 1);
    });

    it('should have exactly 7 parameters', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

      assert.strictEqual(metadata.parameters.length, 7);
    });
  });

  describe('Parameter Validation', () => {
    it('should have valid min/max ranges', async () => {
      const { AutoWahEffect } = await import('../../fx/effects/autowah.js');
      const metadata = AutoWahEffect.getMetadata();

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
