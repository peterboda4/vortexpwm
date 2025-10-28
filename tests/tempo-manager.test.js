// tests/tempo-manager.test.js - Unit tests for TempoManager

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TempoManager } from '../utils/tempo-manager.js';

describe('TempoManager', () => {
  describe('constructor', () => {
    it('should create instance with default BPM of 120', () => {
      const tm = new TempoManager();
      assert.strictEqual(tm.getBPM(), 120);
      assert.strictEqual(tm.getSource(), 'manual');
    });

    it('should accept custom initial BPM', () => {
      const tm = new TempoManager(140);
      assert.strictEqual(tm.getBPM(), 140);
    });

    it('should clamp initial BPM to valid range (20-300)', () => {
      const tm1 = new TempoManager(10); // Too low
      assert.strictEqual(tm1.getBPM(), 20);

      const tm2 = new TempoManager(500); // Too high
      assert.strictEqual(tm2.getBPM(), 300);
    });
  });

  describe('setBPM', () => {
    it('should set BPM within valid range', () => {
      const tm = new TempoManager();
      tm.setBPM(140);
      assert.strictEqual(tm.getBPM(), 140);
    });

    it('should clamp BPM to minimum (20)', () => {
      const tm = new TempoManager();
      tm.setBPM(10);
      assert.strictEqual(tm.getBPM(), 20);

      tm.setBPM(-50);
      assert.strictEqual(tm.getBPM(), 20);
    });

    it('should clamp BPM to maximum (300)', () => {
      const tm = new TempoManager();
      tm.setBPM(500);
      assert.strictEqual(tm.getBPM(), 300);

      tm.setBPM(1000);
      assert.strictEqual(tm.getBPM(), 300);
    });

    it('should accept valid edge case values', () => {
      const tm = new TempoManager();
      tm.setBPM(20); // Minimum
      assert.strictEqual(tm.getBPM(), 20);

      tm.setBPM(300); // Maximum
      assert.strictEqual(tm.getBPM(), 300);
    });

    it('should set source to provided value', () => {
      const tm = new TempoManager();
      tm.setBPM(130, 'midi');
      assert.strictEqual(tm.getSource(), 'midi');

      tm.setBPM(140, 'manual');
      assert.strictEqual(tm.getSource(), 'manual');
    });

    it('should default source to "manual" if not provided', () => {
      const tm = new TempoManager();
      tm.setBPM(150);
      assert.strictEqual(tm.getSource(), 'manual');
    });

    it('should trigger onChange callback when BPM changes', () => {
      const tm = new TempoManager();
      let callbackCalled = false;
      let receivedBPM = null;
      let receivedSource = null;

      tm.onChange = (bpm, source) => {
        callbackCalled = true;
        receivedBPM = bpm;
        receivedSource = source;
      };

      tm.setBPM(150);

      assert.strictEqual(callbackCalled, true);
      assert.strictEqual(receivedBPM, 150);
      assert.strictEqual(receivedSource, 'manual');
    });

    it('should trigger onChange callback when source changes', () => {
      const tm = new TempoManager(120);
      let callCount = 0;

      tm.onChange = () => {
        callCount++;
      };

      tm.setBPM(120, 'midi'); // Same BPM, different source
      assert.strictEqual(callCount, 1);
    });

    it('should not trigger onChange if BPM and source are unchanged', () => {
      const tm = new TempoManager(120);
      let callCount = 0;

      tm.onChange = () => {
        callCount++;
      };

      tm.setBPM(120, 'manual'); // Same BPM and source
      assert.strictEqual(callCount, 0);
    });
  });

  describe('getBPM', () => {
    it('should return current BPM value', () => {
      const tm = new TempoManager(135);
      assert.strictEqual(tm.getBPM(), 135);
    });

    it('should return updated BPM after setBPM', () => {
      const tm = new TempoManager(100);
      tm.setBPM(180);
      assert.strictEqual(tm.getBPM(), 180);
    });
  });

  describe('getSource', () => {
    it('should return current source', () => {
      const tm = new TempoManager();
      assert.strictEqual(tm.getSource(), 'manual');
    });

    it('should return updated source after setBPM', () => {
      const tm = new TempoManager();
      tm.setBPM(140, 'midi');
      assert.strictEqual(tm.getSource(), 'midi');
    });
  });

  describe('reset', () => {
    it('should reset BPM to default (120)', () => {
      const tm = new TempoManager(180);
      tm.reset();
      assert.strictEqual(tm.getBPM(), 120);
    });

    it('should set source to manual by default', () => {
      const tm = new TempoManager();
      tm.setBPM(140, 'midi');
      tm.reset();
      assert.strictEqual(tm.getSource(), 'manual');
    });

    it('should accept custom source parameter', () => {
      const tm = new TempoManager();
      tm.reset('midi');
      assert.strictEqual(tm.getBPM(), 120);
      assert.strictEqual(tm.getSource(), 'midi');
    });

    it('should trigger onChange callback', () => {
      const tm = new TempoManager(180);
      let callbackCalled = false;

      tm.onChange = (bpm, source) => {
        callbackCalled = true;
        assert.strictEqual(bpm, 120);
        assert.strictEqual(source, 'manual');
      };

      tm.reset();
      assert.strictEqual(callbackCalled, true);
    });
  });

  describe('isValidBPM', () => {
    it('should return true for valid BPM values', () => {
      const tm = new TempoManager();
      assert.strictEqual(tm.isValidBPM(20), true);
      assert.strictEqual(tm.isValidBPM(120), true);
      assert.strictEqual(tm.isValidBPM(300), true);
      assert.strictEqual(tm.isValidBPM(75.5), true);
    });

    it('should return false for invalid BPM values', () => {
      const tm = new TempoManager();
      assert.strictEqual(tm.isValidBPM(19), false);
      assert.strictEqual(tm.isValidBPM(301), false);
      assert.strictEqual(tm.isValidBPM(-10), false);
      assert.strictEqual(tm.isValidBPM(1000), false);
    });

    it('should return false for non-numeric values', () => {
      const tm = new TempoManager();
      assert.strictEqual(tm.isValidBPM('120'), false);
      assert.strictEqual(tm.isValidBPM(null), false);
      assert.strictEqual(tm.isValidBPM(undefined), false);
      assert.strictEqual(tm.isValidBPM(NaN), false);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid BPM changes', () => {
      const tm = new TempoManager();
      let callCount = 0;

      tm.onChange = () => {
        callCount++;
      };

      for (let i = 20; i <= 300; i += 10) {
        tm.setBPM(i);
      }

      assert.strictEqual(tm.getBPM(), 300);
      assert.strictEqual(callCount, 29); // (300-20)/10 + 1 = 29 changes
    });

    it('should handle onChange being null', () => {
      const tm = new TempoManager();
      tm.onChange = null;

      // Should not throw
      assert.doesNotThrow(() => {
        tm.setBPM(140);
      });
    });

    it('should handle onChange not being a function', () => {
      const tm = new TempoManager();
      tm.onChange = 'not a function';

      // Should not throw
      assert.doesNotThrow(() => {
        tm.setBPM(140);
      });
    });
  });
});
