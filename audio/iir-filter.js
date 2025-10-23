// audio/iir-filter.js - IIR resonant filter (24dB lowpass or 18dB highpass)

export class IIRFilter {
  constructor() {
    // Filter state variables (up to 3 biquads in series for 18dB HPF)
    this.reset();
  }

  reset() {
    // First biquad state
    this.x1_1 = 0;
    this.x2_1 = 0;
    this.y1_1 = 0;
    this.y2_1 = 0;

    // Second biquad state
    this.x1_2 = 0;
    this.x2_2 = 0;
    this.y1_2 = 0;
    this.y2_2 = 0;

    // Third biquad state (for 18dB HPF)
    this.x1_3 = 0;
    this.x2_3 = 0;
    this.y1_3 = 0;
    this.y2_3 = 0;

    // Cached coefficients
    this.b0_1 = 1;
    this.b1_1 = 0;
    this.b2_1 = 0;
    this.a1_1 = 0;
    this.a2_1 = 0;

    this.b0_2 = 1;
    this.b1_2 = 0;
    this.b2_2 = 0;
    this.a1_2 = 0;
    this.a2_2 = 0;

    this.b0_3 = 1;
    this.b1_3 = 0;
    this.b2_3 = 0;
    this.a1_3 = 0;
    this.a2_3 = 0;

    this.lastCutoff = -1;
    this.lastResonance = -1;
    this.lastFilterType = -1;
  }

  // Calculate biquad coefficients
  // filterType: 0 = 24dB lowpass, 1 = 18dB highpass
  updateCoefficients(cutoffFreq, resonance, sampleRate, filterType = 0) {
    // Only recalculate if parameters changed significantly
    if (
      Math.abs(cutoffFreq - this.lastCutoff) < 0.1 &&
      Math.abs(resonance - this.lastResonance) < 0.001 &&
      filterType === this.lastFilterType
    ) {
      return;
    }

    this.lastCutoff = cutoffFreq;
    this.lastResonance = resonance;
    this.lastFilterType = filterType;

    // Clamp parameters
    cutoffFreq = Math.max(10, Math.min(cutoffFreq, sampleRate * 0.45));
    resonance = Math.max(0, Math.min(resonance, 0.99));

    // Pre-warp frequency for bilinear transform
    const omega = (2 * Math.PI * cutoffFreq) / sampleRate;
    const sin = Math.sin(omega);
    const cos = Math.cos(omega);

    // Quality factor - higher resonance = lower Q bandwidth
    const Q = 1 / (2 - 2 * resonance + 0.1);
    const alpha = sin / (2 * Q);

    const norm = 1 / (1 + alpha);

    if (filterType === 0) {
      // 24dB Lowpass (2 biquads in series)
      this.b0_1 = this.b0_2 = (1 - cos) * 0.5 * norm;
      this.b1_1 = this.b1_2 = (1 - cos) * norm;
      this.b2_1 = this.b2_2 = (1 - cos) * 0.5 * norm;
      this.a1_1 = this.a1_2 = -2 * cos * norm;
      this.a2_1 = this.a2_2 = (1 - alpha) * norm;
    } else {
      // 18dB Highpass (3 biquads in series)
      this.b0_1 = this.b0_2 = this.b0_3 = (1 + cos) * 0.5 * norm;
      this.b1_1 = this.b1_2 = this.b1_3 = -(1 + cos) * norm;
      this.b2_1 = this.b2_2 = this.b2_3 = (1 + cos) * 0.5 * norm;
      this.a1_1 = this.a1_2 = this.a1_3 = -2 * cos * norm;
      this.a2_1 = this.a2_2 = this.a2_3 = (1 - alpha) * norm;
    }
  }

  // Process single sample through filter
  // filterType: 0 = 24dB lowpass (2 stages), 1 = 18dB highpass (3 stages)
  processSample(input, cutoffFreq, resonance, sampleRate, filterType = 0) {
    this.updateCoefficients(cutoffFreq, resonance, sampleRate, filterType);

    // First biquad
    const y1 =
      this.b0_1 * input +
      this.b1_1 * this.x1_1 +
      this.b2_1 * this.x2_1 -
      this.a1_1 * this.y1_1 -
      this.a2_1 * this.y2_1;

    // Update first biquad state
    this.x2_1 = this.x1_1;
    this.x1_1 = input;
    this.y2_1 = this.y1_1;
    this.y1_1 = y1;

    // Second biquad (input is output from first)
    const y2 =
      this.b0_2 * y1 +
      this.b1_2 * this.x1_2 +
      this.b2_2 * this.x2_2 -
      this.a1_2 * this.y1_2 -
      this.a2_2 * this.y2_2;

    // Update second biquad state
    this.x2_2 = this.x1_2;
    this.x1_2 = y1;
    this.y2_2 = this.y1_2;
    this.y1_2 = y2;

    // For 18dB highpass, add third biquad stage
    if (filterType === 1) {
      const y3 =
        this.b0_3 * y2 +
        this.b1_3 * this.x1_3 +
        this.b2_3 * this.x2_3 -
        this.a1_3 * this.y1_3 -
        this.a2_3 * this.y2_3;

      // Update third biquad state
      this.x2_3 = this.x1_3;
      this.x1_3 = y2;
      this.y2_3 = this.y1_3;
      this.y1_3 = y3;

      return y3;
    }

    return y2;
  }
}
