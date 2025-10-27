/**
 * Tests for ParameterManager
 * Run with: node --test tests/parameter-manager.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ParameterManager } from '../fx/parameter-manager.js';

describe('ParameterManager', () => {
  describe('Effect Registration', () => {
    it('should register effect parameters', () => {
      const pm = new ParameterManager();
      const params = [
        { name: 'drive', min: 1, max: 20, default: 5 },
        { name: 'mix', min: 0, max: 1, default: 0.5 },
      ];

      pm.registerEffect('test', params);

      const registered = pm.getEffectParameters('test');
      assert.ok(registered instanceof Map);
      assert.strictEqual(registered.size, 2);
    });

    it('should throw on invalid parameter definition', () => {
      const pm = new ParameterManager();
      const params = [{ name: 'drive' }]; // Missing min/max

      assert.throws(() => {
        pm.registerEffect('test', params);
      });
    });

    it('should normalize parameter definitions', () => {
      const pm = new ParameterManager();
      const params = [
        {
          name: 'drive',
          min: 1,
          max: 20,
          // No default, label, type, unit specified
        },
      ];

      pm.registerEffect('test', params);
      const def = pm.getParameterDef('test', 'drive');

      assert.strictEqual(def.default, 10.5); // Midpoint
      assert.strictEqual(def.label, 'drive'); // Same as name
      assert.strictEqual(def.type, 'number'); // Default type
      assert.strictEqual(def.unit, ''); // Empty unit
    });
  });

  describe('Value Validation', () => {
    it('should clamp numeric values to min/max', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'param', min: 0, max: 10, default: 5 },
      ]);

      assert.strictEqual(pm.validateValue('test', 'param', 15), 10); // Clamp to max
      assert.strictEqual(pm.validateValue('test', 'param', -5), 0); // Clamp to min
      assert.strictEqual(pm.validateValue('test', 'param', 5), 5); // In range
    });

    it('should apply step quantization', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'param', min: 0, max: 10, default: 5, step: 1 },
      ]);

      assert.strictEqual(pm.validateValue('test', 'param', 5.7), 6); // Round to nearest step
      assert.strictEqual(pm.validateValue('test', 'param', 5.3), 5);
    });

    it('should handle boolean type', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'enabled', min: 0, max: 1, default: 1, type: 'boolean' },
      ]);

      assert.strictEqual(pm.validateValue('test', 'enabled', 1), true);
      assert.strictEqual(pm.validateValue('test', 'enabled', 0), false);
      assert.strictEqual(pm.validateValue('test', 'enabled', 'yes'), true);
    });

    it('should handle enum type', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        {
          name: 'wave',
          min: 0,
          max: 2,
          default: 'sine',
          type: 'enum',
          enum: ['sine', 'triangle', 'square'],
        },
      ]);

      assert.strictEqual(pm.validateValue('test', 'wave', 'sine'), 'sine');
      assert.strictEqual(
        pm.validateValue('test', 'wave', 'invalid'),
        'sine'
      ); // Fallback to default
    });

    it('should return default for invalid numbers', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'param', min: 0, max: 10, default: 5 },
      ]);

      assert.strictEqual(pm.validateValue('test', 'param', 'not-a-number'), 5);
      assert.strictEqual(pm.validateValue('test', 'param', NaN), 5);
    });
  });

  describe('Value Management', () => {
    it('should set and get values', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      pm.setValue('inst1', 'test', 'drive', 10);
      assert.strictEqual(pm.getValue('inst1', 'test', 'drive'), 10);
    });

    it('should return default for unset values', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      assert.strictEqual(pm.getValue('inst1', 'test', 'drive'), 5); // Default
    });

    it('should validate on setValue', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'param', min: 0, max: 10, default: 5 },
      ]);

      const result = pm.setValue('inst1', 'test', 'param', 15);
      assert.strictEqual(result, 10); // Clamped
      assert.strictEqual(pm.getValue('inst1', 'test', 'param'), 10);
    });

    it('should reset to default', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      pm.setValue('inst1', 'test', 'drive', 15);
      pm.resetToDefault('inst1', 'test', 'drive');

      assert.strictEqual(pm.getValue('inst1', 'test', 'drive'), 5);
    });

    it('should reset all to defaults', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
        { name: 'mix', min: 0, max: 1, default: 0.5 },
      ]);

      pm.setValue('inst1', 'test', 'drive', 15);
      pm.setValue('inst1', 'test', 'mix', 0.8);
      pm.resetAllToDefaults('inst1', 'test');

      assert.strictEqual(pm.getValue('inst1', 'test', 'drive'), 5);
      assert.strictEqual(pm.getValue('inst1', 'test', 'mix'), 0.5);
    });

    it('should clear instance', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      pm.setValue('inst1', 'test', 'drive', 15);
      pm.clearInstance('inst1');

      // Should return default after clear
      assert.strictEqual(pm.getValue('inst1', 'test', 'drive'), 5);
    });
  });

  describe('Change Listeners', () => {
    it('should notify listeners on value change', (t, done) => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      let notified = false;
      pm.addListener('inst1', (param, newVal, oldVal) => {
        assert.strictEqual(param, 'drive');
        assert.strictEqual(newVal, 10);
        assert.strictEqual(oldVal, undefined);
        notified = true;
      });

      pm.setValue('inst1', 'test', 'drive', 10);
      assert.ok(notified);
      done();
    });

    it('should not notify if value unchanged', (t, done) => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      pm.setValue('inst1', 'test', 'drive', 10);

      let notifyCount = 0;
      pm.addListener('inst1', () => {
        notifyCount++;
      });

      pm.setValue('inst1', 'test', 'drive', 10); // Same value
      assert.strictEqual(notifyCount, 0);
      done();
    });

    it('should allow unsubscribe', (t, done) => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      let notifyCount = 0;
      const unsubscribe = pm.addListener('inst1', () => {
        notifyCount++;
      });

      pm.setValue('inst1', 'test', 'drive', 10);
      assert.strictEqual(notifyCount, 1);

      unsubscribe();
      pm.setValue('inst1', 'test', 'drive', 15);
      assert.strictEqual(notifyCount, 1); // Not incremented
      done();
    });
  });

  describe('Presets', () => {
    it('should register and load presets', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
        { name: 'mix', min: 0, max: 1, default: 0.5 },
      ]);

      pm.registerPreset('test', 'heavy', { drive: 15, mix: 0.8 });
      const success = pm.loadPreset('inst1', 'test', 'heavy');

      assert.ok(success);
      assert.strictEqual(pm.getValue('inst1', 'test', 'drive'), 15);
      assert.strictEqual(pm.getValue('inst1', 'test', 'mix'), 0.8);
    });

    it('should return false for non-existent preset', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      const success = pm.loadPreset('inst1', 'test', 'nonexistent');
      assert.strictEqual(success, false);
    });

    it('should list available presets', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 1, max: 20, default: 5 },
      ]);

      pm.registerPreset('test', 'preset1', { drive: 10 });
      pm.registerPreset('test', 'preset2', { drive: 15 });

      const presets = pm.getPresets('test');
      assert.deepStrictEqual(presets.sort(), ['preset1', 'preset2']);
    });
  });

  describe('Normalization', () => {
    it('should convert to/from normalized values', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'drive', min: 0, max: 100, default: 50 },
      ]);

      assert.strictEqual(pm.toNormalized('test', 'drive', 0), 0);
      assert.strictEqual(pm.toNormalized('test', 'drive', 50), 0.5);
      assert.strictEqual(pm.toNormalized('test', 'drive', 100), 1);

      assert.strictEqual(pm.fromNormalized('test', 'drive', 0), 0);
      assert.strictEqual(pm.fromNormalized('test', 'drive', 0.5), 50);
      assert.strictEqual(pm.fromNormalized('test', 'drive', 1), 100);
    });

    it('should respect step in fromNormalized', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'param', min: 0, max: 10, default: 5, step: 1 },
      ]);

      assert.strictEqual(pm.fromNormalized('test', 'param', 0.57), 6);
      assert.strictEqual(pm.fromNormalized('test', 'param', 0.33), 3);
    });
  });

  describe('Formatting', () => {
    it('should format numeric values with units', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'freq', min: 0, max: 1000, default: 500, unit: 'Hz' },
      ]);

      assert.strictEqual(
        pm.formatValue('test', 'freq', 440),
        '440.00 Hz'
      );
    });

    it('should format boolean values', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        { name: 'enabled', min: 0, max: 1, default: 1, type: 'boolean' },
      ]);

      assert.strictEqual(pm.formatValue('test', 'enabled', true), 'On');
      assert.strictEqual(pm.formatValue('test', 'enabled', false), 'Off');
    });

    it('should format enum values', () => {
      const pm = new ParameterManager();
      pm.registerEffect('test', [
        {
          name: 'wave',
          min: 0,
          max: 2,
          default: 'sine',
          type: 'enum',
          enum: ['sine', 'triangle', 'square'],
        },
      ]);

      assert.strictEqual(pm.formatValue('test', 'wave', 'sine'), 'sine');
    });
  });
});
