// tests/music.test.js - tests for music utility functions

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { midiFromName, midiToNoteName, clamp } from '../utils/music.js';

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
});
