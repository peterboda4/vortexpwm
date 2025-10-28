// tests/music.test.js - tests for music utility functions

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  midiFromName,
  midiToNoteName,
  clamp,
  bpmToHz,
  getTempoDivisions,
  isValidTempoDivision,
  TEMPO_DIVISIONS,
} from '../utils/music.js';

describe('music utilities', () => {
  describe('midiFromName', () => {
    it('should convert C4 to MIDI 60', () => {
      assert.strictEqual(midiFromName('C4'), 60);
    });

    it('should convert A4 to MIDI 69', () => {
      assert.strictEqual(midiFromName('A4'), 69);
    });

    it('should handle sharps', () => {
      assert.strictEqual(midiFromName('C#4'), 61);
      assert.strictEqual(midiFromName('F#4'), 66);
    });

    it('should handle flats', () => {
      assert.strictEqual(midiFromName('Db4'), 61);
      assert.strictEqual(midiFromName('Bb3'), 58);
    });

    it('should handle negative octaves', () => {
      assert.strictEqual(midiFromName('C-1'), 0);
    });

    it('should throw on invalid note names', () => {
      assert.throws(() => midiFromName('X4'));
      assert.throws(() => midiFromName('C'));
      assert.throws(() => midiFromName('4C'));
    });
  });

  describe('midiToNoteName', () => {
    it('should convert MIDI 60 to C4', () => {
      assert.strictEqual(midiToNoteName(60), 'C4');
    });

    it('should convert MIDI 69 to A4', () => {
      assert.strictEqual(midiToNoteName(69), 'A4');
    });

    it('should use sharps for black keys', () => {
      assert.strictEqual(midiToNoteName(61), 'C#4');
      assert.strictEqual(midiToNoteName(66), 'F#4');
    });

    it('should handle low MIDI numbers', () => {
      assert.strictEqual(midiToNoteName(0), 'C-1');
      assert.strictEqual(midiToNoteName(12), 'C0');
    });

    it('should handle high MIDI numbers', () => {
      assert.strictEqual(midiToNoteName(127), 'G9');
    });
  });

  describe('clamp', () => {
    it('should clamp value below minimum', () => {
      assert.strictEqual(clamp(-5, 0, 10), 0);
    });

    it('should clamp value above maximum', () => {
      assert.strictEqual(clamp(15, 0, 10), 10);
    });

    it('should return value within range', () => {
      assert.strictEqual(clamp(5, 0, 10), 5);
    });

    it('should handle edge cases', () => {
      assert.strictEqual(clamp(0, 0, 10), 0);
      assert.strictEqual(clamp(10, 0, 10), 10);
    });
  });

  describe('bpmToHz', () => {
    describe('basic divisions', () => {
      it('should convert 120 BPM at 1/4 to 2 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/4'), 2.0);
      });

      it('should convert 120 BPM at 1/8 to 4 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/8'), 4.0);
      });

      it('should convert 120 BPM at 1/16 to 8 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/16'), 8.0);
      });

      it('should convert 120 BPM at 1/2 to 1 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/2'), 1.0);
      });

      it('should convert 120 BPM at 1/1 to 0.5 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/1'), 0.5);
      });

      it('should convert 120 BPM at 1/32 to 16 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/32'), 16.0);
      });
    });

    describe('dotted divisions', () => {
      it('should convert 120 BPM at 1/4D to 3 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/4D'), 3.0);
      });

      it('should convert 120 BPM at 1/8D to 6 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/8D'), 6.0);
      });

      it('should convert 120 BPM at 1/2D to 1.5 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/2D'), 1.5);
      });

      it('should convert 120 BPM at 1/16D to 12 Hz', () => {
        assert.strictEqual(bpmToHz(120, '1/16D'), 12.0);
      });
    });

    describe('triplet divisions', () => {
      it('should convert 120 BPM at 1/4T to ~1.333 Hz', () => {
        const result = bpmToHz(120, '1/4T');
        assert.ok(Math.abs(result - 1.333333) < 0.0001);
      });

      it('should convert 120 BPM at 1/8T to ~2.666 Hz', () => {
        const result = bpmToHz(120, '1/8T');
        assert.ok(Math.abs(result - 2.666667) < 0.0001);
      });

      it('should convert 120 BPM at 1/2T to ~0.666 Hz', () => {
        const result = bpmToHz(120, '1/2T');
        assert.ok(Math.abs(result - 0.666667) < 0.0001);
      });

      it('should convert 120 BPM at 1/16T to ~5.333 Hz', () => {
        const result = bpmToHz(120, '1/16T');
        assert.ok(Math.abs(result - 5.333333) < 0.0001);
      });
    });

    describe('different BPM values', () => {
      it('should convert 60 BPM at 1/4 to 1 Hz', () => {
        assert.strictEqual(bpmToHz(60, '1/4'), 1.0);
      });

      it('should convert 180 BPM at 1/4 to 3 Hz', () => {
        assert.strictEqual(bpmToHz(180, '1/4'), 3.0);
      });

      it('should convert 240 BPM at 1/8 to 8 Hz', () => {
        assert.strictEqual(bpmToHz(240, '1/8'), 8.0);
      });

      it('should handle minimum BPM (20)', () => {
        const result = bpmToHz(20, '1/4');
        assert.ok(Math.abs(result - 0.333333) < 0.0001);
      });

      it('should handle maximum BPM (300)', () => {
        assert.strictEqual(bpmToHz(300, '1/4'), 5.0);
      });
    });

    describe('default division', () => {
      it('should default to 1/4 if division not specified', () => {
        assert.strictEqual(bpmToHz(120), 2.0);
      });
    });

    describe('error handling', () => {
      it('should throw on invalid BPM (too low)', () => {
        assert.throws(() => bpmToHz(10, '1/4'), /Invalid BPM/);
      });

      it('should throw on invalid BPM (too high)', () => {
        assert.throws(() => bpmToHz(500, '1/4'), /Invalid BPM/);
      });

      it('should throw on non-numeric BPM', () => {
        assert.throws(() => bpmToHz('120', '1/4'), /Invalid BPM/);
      });

      it('should throw on invalid division', () => {
        assert.throws(() => bpmToHz(120, '1/3'), /Invalid tempo division/);
      });

      it('should throw on undefined division', () => {
        assert.throws(() => bpmToHz(120, 'invalid'), /Invalid tempo division/);
      });
    });

    describe('mathematical accuracy', () => {
      it('should maintain precision for complex calculations', () => {
        // 137 BPM at 1/16T (triplet sixteenth)
        const result = bpmToHz(137, '1/16T');
        const expected = (137 / 60) * TEMPO_DIVISIONS['1/16T'];
        assert.ok(Math.abs(result - expected) < 0.000001);
      });
    });
  });

  describe('getTempoDivisions', () => {
    it('should return array of division names', () => {
      const divisions = getTempoDivisions();
      assert.ok(Array.isArray(divisions));
      assert.ok(divisions.length > 0);
    });

    it('should include standard divisions', () => {
      const divisions = getTempoDivisions();
      assert.ok(divisions.includes('1/1'));
      assert.ok(divisions.includes('1/2'));
      assert.ok(divisions.includes('1/4'));
      assert.ok(divisions.includes('1/8'));
      assert.ok(divisions.includes('1/16'));
      assert.ok(divisions.includes('1/32'));
    });

    it('should include dotted divisions', () => {
      const divisions = getTempoDivisions();
      assert.ok(divisions.includes('1/4D'));
      assert.ok(divisions.includes('1/8D'));
      assert.ok(divisions.includes('1/16D'));
    });

    it('should include triplet divisions', () => {
      const divisions = getTempoDivisions();
      assert.ok(divisions.includes('1/4T'));
      assert.ok(divisions.includes('1/8T'));
      assert.ok(divisions.includes('1/16T'));
    });
  });

  describe('isValidTempoDivision', () => {
    it('should return true for valid divisions', () => {
      assert.strictEqual(isValidTempoDivision('1/4'), true);
      assert.strictEqual(isValidTempoDivision('1/8'), true);
      assert.strictEqual(isValidTempoDivision('1/16'), true);
      assert.strictEqual(isValidTempoDivision('1/4D'), true);
      assert.strictEqual(isValidTempoDivision('1/8T'), true);
    });

    it('should return false for invalid divisions', () => {
      assert.strictEqual(isValidTempoDivision('1/3'), false);
      assert.strictEqual(isValidTempoDivision('invalid'), false);
      assert.strictEqual(isValidTempoDivision(''), false);
      assert.strictEqual(isValidTempoDivision('1/64'), false);
    });

    it('should return false for non-string values', () => {
      assert.strictEqual(isValidTempoDivision(null), false);
      assert.strictEqual(isValidTempoDivision(undefined), false);
      assert.strictEqual(isValidTempoDivision(123), false);
    });
  });

  describe('TEMPO_DIVISIONS constant', () => {
    it('should be an object', () => {
      assert.strictEqual(typeof TEMPO_DIVISIONS, 'object');
    });

    it('should have correct multiplier for 1/4 (reference)', () => {
      assert.strictEqual(TEMPO_DIVISIONS['1/4'], 1.0);
    });

    it('should have multipliers proportional to note length', () => {
      // 1/8 should be 2x faster than 1/4
      assert.strictEqual(TEMPO_DIVISIONS['1/8'], 2.0);
      // 1/16 should be 4x faster than 1/4
      assert.strictEqual(TEMPO_DIVISIONS['1/16'], 4.0);
      // 1/2 should be 2x slower than 1/4
      assert.strictEqual(TEMPO_DIVISIONS['1/2'], 0.5);
    });
  });
});
