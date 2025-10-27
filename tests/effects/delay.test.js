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

  describe('Audio Processing', () => {
    it('should pass through audio when disabled', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');
      effect.enabled = false;

      const inputL = 0.5;
      const inputR = 0.75;
      const [outputL, outputR] = effect.process(inputL, inputR);

      assert.strictEqual(outputL, inputL);
      assert.strictEqual(outputR, inputR);
    });

    it('should produce delayed output when enabled', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');
      effect.enabled = true;
      effect.mix = 1.0; // 100% wet for testing
      effect.feedback = 0;
      const delayTime = 0.01; // ~480 samples at 48kHz
      effect.delayTimeL = delayTime;
      effect.delayTimeR = delayTime;

      // Send impulse
      effect.process(1.0, 1.0);

      // Process through delay - need to account for writeIndex advancement
      const delaySamples = Math.floor(delayTime * sampleRate);
      let maxOutput = 0;

      // Check outputs around the expected delay time
      for (let i = 0; i < delaySamples + 10; i++) {
        const [outL, outR] = effect.process(0, 0);
        maxOutput = Math.max(maxOutput, outL, outR);
      }

      // Should have seen the delayed impulse
      assert.ok(
        maxOutput > 0.8,
        `Should have delayed impulse (maxOutput: ${maxOutput})`
      );
    });

    it('should mix dry and wet signals', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');
      effect.enabled = true;
      effect.mix = 0.5; // 50/50 mix
      effect.feedback = 0;

      const inputL = 1.0;
      const inputR = 1.0;
      const [outputL, outputR] = effect.process(inputL, inputR);

      // With no delay history, output should be mostly dry
      assert.ok(outputL > 0.4 && outputL < 0.6, 'Should be ~50% dry');
      assert.ok(outputR > 0.4 && outputR < 0.6, 'Should be ~50% dry');
    });

    it('should apply feedback correctly', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');
      effect.enabled = true;
      effect.mix = 1.0; // 100% wet
      effect.feedback = 0.5;
      const delayTime = 0.01; // ~480 samples
      effect.delayTimeL = delayTime;
      effect.delayTimeR = delayTime;

      const delaySamples = Math.floor(delayTime * sampleRate);

      // Send impulse
      effect.process(1.0, 1.0);

      // Find first echo
      let maxFirst = 0;
      for (let i = 0; i < delaySamples + 10; i++) {
        const [outL] = effect.process(0, 0);
        maxFirst = Math.max(maxFirst, outL);
      }

      assert.ok(maxFirst > 0.5, `First echo should be present (${maxFirst})`);

      // Continue processing to find second echo
      let maxSecond = 0;
      for (let i = 0; i < delaySamples + 10; i++) {
        const [outL] = effect.process(0, 0);
        maxSecond = Math.max(maxSecond, outL);
      }

      // Second echo should be quieter due to feedback
      assert.ok(
        maxSecond > 0.1 && maxSecond < maxFirst * 0.7,
        `Second echo should be quieter (first: ${maxFirst}, second: ${maxSecond})`
      );
    });

    it('should reset buffer when reset() is called', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');
      effect.enabled = true;

      // Fill buffer with data
      for (let i = 0; i < 100; i++) {
        effect.process(1.0, 1.0);
      }

      // Reset
      effect.reset();

      // Process silence and check output is clean
      const [outputL, outputR] = effect.process(0, 0);
      assert.strictEqual(
        outputL,
        0,
        'Left channel should be silent after reset'
      );
      assert.strictEqual(
        outputR,
        0,
        'Right channel should be silent after reset'
      );
    });

    it('should handle parameter changes', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');

      effect.onParameterChange('delayTimeL', 0.5);
      assert.strictEqual(effect.delayTimeL, 0.5);

      effect.onParameterChange('feedback', 0.7);
      assert.strictEqual(effect.feedback, 0.7);

      effect.onParameterChange('mix', 0.8);
      assert.strictEqual(effect.mix, 0.8);
    });

    it('should clamp parameters to valid ranges', async () => {
      const { DelayEffect } = await import('../../fx/effects/delay.js');
      const sampleRate = 48000;
      const effect = new DelayEffect(sampleRate, 'delay-test');

      effect.onParameterChange('delayTimeL', 10); // Above max (2)
      assert.strictEqual(effect.delayTimeL, 2);

      effect.onParameterChange('delayTimeL', -1); // Below min (0.001)
      assert.strictEqual(effect.delayTimeL, 0.001);

      effect.onParameterChange('feedback', 1.5); // Above max (0.95)
      assert.strictEqual(effect.feedback, 0.95);

      effect.onParameterChange('mix', -0.5); // Below min (0)
      assert.strictEqual(effect.mix, 0);
    });
  });
});
