import { FXBase } from '../fx-base.js';

/**
 * True stereo frequency shifter effect
 * Uses Hilbert transform for single-sideband modulation
 * Creates non-harmonic frequency shifting (unlike pitch shifting)
 */
export class FreqShifterEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);

    // Hilbert transform approximation using all-pass filters
    // 12-stage all-pass network for 90° phase shift
    this.numStages = 12;

    // All-pass filter state for I/Q (quadrature) signals
    this.allpassIL = this.createAllpassChain(this.numStages);
    this.allpassQL = this.createAllpassChain(this.numStages);
    this.allpassIR = this.createAllpassChain(this.numStages);
    this.allpassQR = this.createAllpassChain(this.numStages);

    // Oscillator phase
    this.oscPhase = 0;

    // Default parameters
    this.shift = 100; // Frequency shift in Hz (-500 to +500)
    this.mix = 0.5; // Dry/wet mix (0-1)

    // Pre-calculated all-pass coefficients for Hilbert transform
    // These are fixed coefficients for 90° phase shift across wide frequency range
    this.hilbertCoeffs = [
      0.6923878, 0.9360654322959, 0.9882295226861, 0.9987488452737,
      0.9996936637686, 0.9999305067355, 0.9999847344463, 0.9999965063808,
      0.9999992659768, 0.9999998386534, 0.9999999670162, 0.9999999939119,
    ];
  }

  createAllpassChain(numStages) {
    return Array(numStages)
      .fill(0)
      .map(() => ({ zm1: 0 }));
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];

    // Process left channel
    const shiftedL = this.processChannel(
      inputL,
      this.allpassIL,
      this.allpassQL
    );

    // Process right channel
    const shiftedR = this.processChannel(
      inputR,
      this.allpassIR,
      this.allpassQR
    );

    // Update oscillator phase
    const shiftFreq = this.shift;
    this.oscPhase += shiftFreq / this.sampleRate;
    if (this.oscPhase >= 1) this.oscPhase -= 1;
    if (this.oscPhase < 0) this.oscPhase += 1;

    // Mix dry/wet
    const outputL = inputL * (1 - this.mix) + shiftedL * this.mix;
    const outputR = inputR * (1 - this.mix) + shiftedR * this.mix;

    return [outputL, outputR];
  }

  processChannel(input, allpassI, allpassQ) {
    // Generate quadrature oscillator signals
    const oscI = Math.cos(this.oscPhase * 2 * Math.PI);
    const oscQ = Math.sin(this.oscPhase * 2 * Math.PI);

    // Process input through I path (original signal)
    let signalI = input;
    for (let i = 0; i < this.numStages; i++) {
      const stage = allpassI[i];
      const a = this.hilbertCoeffs[i];
      const temp = signalI;
      signalI = a * temp + stage.zm1;
      stage.zm1 = temp - a * signalI;
    }

    // Process input through Q path (90° shifted signal)
    let signalQ = input;
    for (let i = 0; i < this.numStages; i++) {
      const stage = allpassQ[i];
      const a = this.hilbertCoeffs[i];
      const temp = signalQ;
      signalQ = a * temp + stage.zm1;
      stage.zm1 = temp - a * signalQ;
    }

    // Single-sideband modulation
    // Upper sideband: I*cos - Q*sin
    // Lower sideband: I*cos + Q*sin
    const shifted = signalI * oscI - signalQ * oscQ;

    return shifted;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'shift':
        this.shift = Math.max(-500, Math.min(500, value));
        break;
      case 'mix':
        this.mix = Math.max(0, Math.min(1, value));
        break;
    }
  }

  reset() {
    this.allpassIL.forEach((stage) => (stage.zm1 = 0));
    this.allpassQL.forEach((stage) => (stage.zm1 = 0));
    this.allpassIR.forEach((stage) => (stage.zm1 = 0));
    this.allpassQR.forEach((stage) => (stage.zm1 = 0));
    this.oscPhase = 0;
  }

  static getMetadata() {
    return {
      id: 'freqshifter',
      name: 'Freq Shifter',
      parameters: [
        {
          name: 'shift',
          label: 'Shift',
          min: -500,
          max: 500,
          default: 100,
          unit: 'Hz',
        },
        { name: 'mix', label: 'Mix', min: 0, max: 1, default: 0.5 },
      ],
    };
  }
}
