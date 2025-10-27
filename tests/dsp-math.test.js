// tests/dsp-math.test.js - tests for DSP mathematical functions

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('DSP Mathematical Functions', () => {
  describe('MIDI to Frequency conversion', () => {
    // Simulate the midiToHz function from worklet
    function midiToHz(m) {
      return 440 * Math.pow(2, (m - 69) / 12);
    }

    it('should convert MIDI 69 (A4) to 440 Hz', () => {
      assert.strictEqual(midiToHz(69), 440);
    });

    it('should convert MIDI 60 (C4) to ~261.63 Hz', () => {
      const freq = midiToHz(60);
      assert.ok(Math.abs(freq - 261.6256) < 0.001);
    });

    it('should convert MIDI 81 (A5) to 880 Hz (one octave up)', () => {
      const freq = midiToHz(81);
      assert.ok(Math.abs(freq - 880) < 0.001);
    });

    it('should convert MIDI 57 (A3) to 220 Hz (one octave down)', () => {
      const freq = midiToHz(57);
      assert.ok(Math.abs(freq - 220) < 0.001);
    });

    it('should handle low MIDI notes', () => {
      const freq = midiToHz(21); // A0
      assert.ok(Math.abs(freq - 27.5) < 0.01);
    });

    it('should handle high MIDI notes', () => {
      const freq = midiToHz(108); // C8
      assert.ok(Math.abs(freq - 4186.01) < 0.1);
    });
  });

  describe('Envelope coefficient calculation', () => {
    // Exponential envelope coefficient: 1 - exp(-1/(time*sampleRate))
    function envelopeCoeff(time, sampleRate) {
      if (time <= 0) return 1.0;
      return 1.0 - Math.exp(-1.0 / ((time / 4.6) * sampleRate));
    }

    it('should return 1.0 for zero time', () => {
      assert.strictEqual(envelopeCoeff(0, 44100), 1.0);
    });

    it('should return coefficient between 0 and 1 for positive time', () => {
      const coeff = envelopeCoeff(0.1, 44100);
      assert.ok(coeff > 0 && coeff < 1);
    });

    it('should return smaller coefficients for longer times', () => {
      const coeff1 = envelopeCoeff(0.1, 44100);
      const coeff2 = envelopeCoeff(1.0, 44100);
      assert.ok(coeff2 < coeff1);
    });

    it('should scale with sample rate', () => {
      const coeff44k = envelopeCoeff(0.1, 44100);
      const coeff48k = envelopeCoeff(0.1, 48000);
      // Higher sample rate = smaller coefficient (slower envelope progression per sample)
      assert.ok(coeff48k < coeff44k);
    });
  });

  describe('Equal-power panning', () => {
    // Equal-power panning law
    function equalPowerPan(pan) {
      const lg = Math.sqrt(0.5 * (1 - pan));
      const rg = Math.sqrt(0.5 * (1 + pan));
      return { left: lg, right: rg };
    }

    it('should produce equal gain at center (pan=0)', () => {
      const { left, right } = equalPowerPan(0);
      assert.ok(Math.abs(left - right) < 0.0001);
      assert.ok(Math.abs(left - Math.sqrt(0.5)) < 0.0001);
    });

    it('should produce full left at pan=-1', () => {
      const { left, right } = equalPowerPan(-1);
      assert.ok(Math.abs(left - 1.0) < 0.0001);
      assert.ok(Math.abs(right - 0.0) < 0.0001);
    });

    it('should produce full right at pan=1', () => {
      const { left, right } = equalPowerPan(1);
      assert.ok(Math.abs(left - 0.0) < 0.0001);
      assert.ok(Math.abs(right - 1.0) < 0.0001);
    });

    it('should maintain constant power (left^2 + right^2 = 1)', () => {
      for (let pan = -1; pan <= 1; pan += 0.1) {
        const { left, right } = equalPowerPan(pan);
        const power = left * left + right * right;
        assert.ok(Math.abs(power - 1.0) < 0.0001);
      }
    });
  });

  describe('PolyBLEP anti-aliasing', () => {
    // PolyBLEP residual correction
    function polyBLEP(t, dt) {
      if (t < dt) {
        t = t / dt;
        return t + t - t * t - 1.0;
      } else if (t > 1.0 - dt) {
        t = (t - 1.0) / dt;
        return t * t + t + t + 1.0;
      }
      return 0.0;
    }

    it('should return 0 when far from discontinuity', () => {
      const blep = polyBLEP(0.5, 0.01);
      assert.strictEqual(blep, 0.0);
    });

    it('should return non-zero near phase=0 discontinuity', () => {
      const blep = polyBLEP(0.005, 0.01);
      assert.ok(blep !== 0.0);
    });

    it('should return non-zero near phase=1 discontinuity', () => {
      const blep = polyBLEP(0.995, 0.01);
      assert.ok(blep !== 0.0);
    });

    it('should be symmetric around discontinuities', () => {
      const dt = 0.01;
      const blep1 = polyBLEP(0.005, dt);
      const blep2 = polyBLEP(0.995, dt);
      // Magnitudes should be similar (different signs)
      assert.ok(Math.abs(Math.abs(blep1) - Math.abs(blep2)) < 0.1);
    });
  });

  describe('Pitch bend conversion', () => {
    // MIDI pitch bend: 14-bit value (0-16383), center = 8192
    function pitchBendToSemitones(pitchBendValue, range) {
      const normalized = (pitchBendValue - 8192) / 8192;
      return normalized * range;
    }

    it('should return 0 semitones at center (8192)', () => {
      assert.strictEqual(pitchBendToSemitones(8192, 2), 0);
    });

    it('should return +range at maximum (16383)', () => {
      const semitones = pitchBendToSemitones(16383, 2);
      assert.ok(Math.abs(semitones - 2.0) < 0.01);
    });

    it('should return -range at minimum (0)', () => {
      const semitones = pitchBendToSemitones(0, 2);
      assert.ok(Math.abs(semitones + 2.0) < 0.01);
    });

    it('should scale with pitch bend range', () => {
      const semitones12 = pitchBendToSemitones(16383, 12);
      const semitones2 = pitchBendToSemitones(16383, 2);
      assert.ok(Math.abs(semitones12 / semitones2 - 6) < 0.1);
    });
  });

  describe('Velocity curve application', () => {
    // Velocity curve: -100=log, 0=linear, 100=exp
    function applyVelocityCurve(velocity, curve) {
      const normalized = velocity / 127;

      if (curve === 0) {
        return normalized;
      } else if (curve < 0) {
        const curveFactor = Math.abs(curve) / 100;
        return Math.pow(normalized, 1 - curveFactor * 0.5);
      } else {
        const curveFactor = curve / 100;
        return Math.pow(normalized, 1 + curveFactor * 2);
      }
    }

    it('should be linear when curve=0', () => {
      assert.strictEqual(applyVelocityCurve(0, 0), 0);
      assert.ok(Math.abs(applyVelocityCurve(64, 0) - 0.5039) < 0.001);
      assert.ok(Math.abs(applyVelocityCurve(127, 0) - 1.0) < 0.001);
    });

    it('should boost low velocities with negative curve (logarithmic)', () => {
      const linear = applyVelocityCurve(32, 0);
      const log = applyVelocityCurve(32, -100);
      assert.ok(log > linear);
    });

    it('should reduce low velocities with positive curve (exponential)', () => {
      const linear = applyVelocityCurve(32, 0);
      const exp = applyVelocityCurve(32, 100);
      assert.ok(exp < linear);
    });

    it('should maintain 0 and 127 velocity endpoints', () => {
      assert.strictEqual(applyVelocityCurve(0, -100), 0);
      assert.strictEqual(applyVelocityCurve(0, 100), 0);
      assert.ok(Math.abs(applyVelocityCurve(127, -100) - 1.0) < 0.001);
      assert.ok(Math.abs(applyVelocityCurve(127, 100) - 1.0) < 0.001);
    });
  });
});
