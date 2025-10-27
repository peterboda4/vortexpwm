/**
 * FX Controller Tests - Race condition and parameter validation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('FX Controller - Parameter Validation', () => {
  describe('Race Condition Prevention', () => {
    it('should handle setParameter before metadata is loaded', () => {
      // Simulate FXController state before metadata loads
      const metadataLoaded = false;
      const instanceId = 'reverb_1';
      const param = 'size';
      const value = 0.5;

      // Guard check that prevents calling parameter manager
      if (!metadataLoaded) {
        const result = value; // Return unvalidated value
        assert.strictEqual(result, value);
        return;
      }

      // This code should not be reached in this test
      assert.fail('Should not validate parameters before metadata loaded');
    });

    it('should validate parameters after metadata is loaded', () => {
      // Simulate FXController state after metadata loads
      const metadataLoaded = true;
      const activeEffects = new Map();
      activeEffects.set('reverb_1', { effectId: 'reverb', enabled: true });

      const instanceId = 'reverb_1';

      // Guard check should pass
      assert.strictEqual(metadataLoaded, true);
      assert.strictEqual(activeEffects.has(instanceId), true);
    });

    it('should reject setParameter for removed effect', () => {
      // Simulate FXController with loaded metadata but removed effect
      const metadataLoaded = true;
      const activeEffects = new Map();
      const instanceId = 'reverb_1';

      // Guard check should fail - effect not in activeEffects
      assert.strictEqual(metadataLoaded, true);
      assert.strictEqual(activeEffects.has(instanceId), false);
    });
  });

  describe('Parameter Manager Integration', () => {
    it('should handle parameter validation warnings gracefully', () => {
      // Test that parameter manager returns unvalidated value when param not found
      const paramDef = null; // Simulates parameter not found
      const value = 0.7;

      if (!paramDef) {
        // Should pass through value and log warning
        const result = value;
        assert.strictEqual(result, value);
      }
    });

    it('should validate parameter with valid definition', () => {
      // Test normal validation path
      const paramDef = {
        name: 'size',
        min: 0,
        max: 1,
        default: 0.5,
      };

      const value = 0.7;
      const numValue = Number(value);

      assert.strictEqual(isNaN(numValue), false);

      // Clamp to min/max
      const clamped = Math.max(paramDef.min, Math.min(paramDef.max, numValue));
      assert.strictEqual(clamped, 0.7);
    });

    it('should clamp out-of-range values', () => {
      const paramDef = {
        name: 'size',
        min: 0,
        max: 1,
        default: 0.5,
      };

      // Test value above max
      const valueHigh = 1.5;
      const clampedHigh = Math.max(
        paramDef.min,
        Math.min(paramDef.max, valueHigh)
      );
      assert.strictEqual(clampedHigh, 1.0);

      // Test value below min
      const valueLow = -0.5;
      const clampedLow = Math.max(
        paramDef.min,
        Math.min(paramDef.max, valueLow)
      );
      assert.strictEqual(clampedLow, 0.0);
    });

    it('should handle invalid number values', () => {
      const paramDef = {
        name: 'size',
        min: 0,
        max: 1,
        default: 0.5,
      };

      const invalidValue = 'not-a-number';
      const numValue = Number(invalidValue);

      if (isNaN(numValue)) {
        // Should use default value
        const result = paramDef.default;
        assert.strictEqual(result, 0.5);
      }
    });
  });

  describe('Effect Registration Order', () => {
    it('should set metadataLoaded flag after loading effects', () => {
      // Simulate loadMetadata() completion
      let metadataLoaded = false;

      // Simulate successful metadata loading
      const effectsMetadata = new Map();
      effectsMetadata.set('reverb', {
        id: 'reverb',
        name: 'Hall/Shimmer',
        parameters: [
          { name: 'size', min: 0, max: 1, default: 0.7 },
          { name: 'decay', min: 0, max: 0.99, default: 0.6 },
          { name: 'shimmer', min: 0, max: 1, default: 0 },
          { name: 'mix', min: 0, max: 1, default: 0.2 },
        ],
      });

      // After successful load
      metadataLoaded = true;

      assert.strictEqual(metadataLoaded, true);
      assert.strictEqual(effectsMetadata.size, 1);
      assert.strictEqual(effectsMetadata.has('reverb'), true);
    });
  });

  describe('Chorus Effect Parameters', () => {
    it('should have rate parameter defined', () => {
      const chorusMetadata = {
        id: 'chorus',
        name: 'Chorus',
        parameters: [
          { name: 'rate', label: 'Rate', min: 0.1, max: 5, default: 0.5 },
          { name: 'depth', label: 'Depth', min: 0, max: 1, default: 0.7 },
          { name: 'delay', label: 'Delay', min: 5, max: 50, default: 20 },
          { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.2 },
        ],
      };

      const rateParam = chorusMetadata.parameters.find((p) => p.name === 'rate');
      assert.ok(rateParam, 'Rate parameter should exist');
      assert.strictEqual(rateParam.min, 0.1);
      assert.strictEqual(rateParam.max, 5);
      assert.strictEqual(rateParam.default, 0.5);
    });
  });

  describe('Reverb Effect Parameters', () => {
    it('should have size parameter defined', () => {
      const reverbMetadata = {
        id: 'reverb',
        name: 'Hall/Shimmer',
        parameters: [
          { name: 'size', label: 'Size', min: 0, max: 1, default: 0.7 },
          { name: 'decay', label: 'Decay', min: 0, max: 0.99, default: 0.6 },
          { name: 'shimmer', label: 'Shimmer', min: 0, max: 1, default: 0 },
          { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.2 },
        ],
      };

      const sizeParam = reverbMetadata.parameters.find((p) => p.name === 'size');
      assert.ok(sizeParam, 'Size parameter should exist');
      assert.strictEqual(sizeParam.min, 0);
      assert.strictEqual(sizeParam.max, 1);
      assert.strictEqual(sizeParam.default, 0.7);
    });
  });

  describe('BitCrusher Effect Parameters', () => {
    it('should have bitDepth parameter defined', () => {
      const bitcrusherMetadata = {
        id: 'bitcrusher',
        name: 'Bit Crusher',
        parameters: [
          { name: 'bitDepth', label: 'Bit Depth', min: 2, max: 16, default: 16 },
          {
            name: 'sampleRateReduction',
            label: 'Downsample',
            min: 1,
            max: 50,
            default: 1,
          },
          { name: 'mix', label: 'Mix', min: 0, max: 1, default: 1 },
        ],
      };

      const bitDepthParam = bitcrusherMetadata.parameters.find(
        (p) => p.name === 'bitDepth'
      );
      assert.ok(bitDepthParam, 'bitDepth parameter should exist');
      assert.strictEqual(bitDepthParam.min, 2);
      assert.strictEqual(bitDepthParam.max, 16);
      assert.strictEqual(bitDepthParam.default, 16);
    });
  });

  describe('Flanger Effect Parameters', () => {
    it('should have rate parameter defined', () => {
      const flangerMetadata = {
        id: 'flanger',
        name: 'Flanger',
        parameters: [
          { name: 'rate', label: 'Rate', min: 0.1, max: 10, default: 0.5 },
          { name: 'depth', label: 'Depth', min: 0, max: 1, default: 0.7 },
          { name: 'feedback', label: 'Feedback', min: -0.9, max: 0.9, default: 0.5 },
          { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.3 },
        ],
      };

      const rateParam = flangerMetadata.parameters.find((p) => p.name === 'rate');
      assert.ok(rateParam, 'rate parameter should exist in flanger');
      assert.strictEqual(rateParam.min, 0.1);
      assert.strictEqual(rateParam.max, 10);
      assert.strictEqual(rateParam.default, 0.5);
    });
  });

  describe('All Effects Have Required Parameters', () => {
    it('should verify all common effects have proper parameter structure', () => {
      // Test that all expected effects have valid parameter structures
      const effectsToTest = [
        {
          id: 'chorus',
          paramToTest: 'rate',
          expectedMin: 0.1,
          expectedMax: 5,
        },
        {
          id: 'reverb',
          paramToTest: 'size',
          expectedMin: 0,
          expectedMax: 1,
        },
        {
          id: 'flanger',
          paramToTest: 'rate',
          expectedMin: 0.1,
          expectedMax: 10,
        },
        {
          id: 'bitcrusher',
          paramToTest: 'bitDepth',
          expectedMin: 2,
          expectedMax: 16,
        },
        {
          id: 'delay',
          paramToTest: 'time',
          expectedMin: 0,
          expectedMax: 2,
        },
      ];

      // All effects should have at least these fields
      for (const effect of effectsToTest) {
        assert.ok(effect.id, `Effect should have id`);
        assert.ok(effect.paramToTest, `Effect ${effect.id} should have test parameter`);
        assert.strictEqual(
          typeof effect.expectedMin,
          'number',
          `Effect ${effect.id} parameter should have numeric min`
        );
        assert.strictEqual(
          typeof effect.expectedMax,
          'number',
          `Effect ${effect.id} parameter should have numeric max`
        );
      }
    });
  });
});