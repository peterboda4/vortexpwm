// ui/parameter-controls.js - synth parameter sliders and controls
import { getParameter } from '../utils/parameter-registry.js';

export function initParameterControls(synth) {
  const byId = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with id "${id}" not found`);
    }
    return element;
  };

  // Throttle parameter updates to avoid overwhelming audio thread
  // Update display immediately but throttle actual parameter changes
  const throttle = (fn, delay) => {
    let lastCall = 0;
    let timeoutId = null;
    let lastArgs = null;

    return function (...args) {
      const now = Date.now();
      lastArgs = args;

      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      } else {
        // Schedule the final call after delay
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          fn.apply(this, lastArgs);
        }, delay);
      }
    };
  };

  // Bind slider helpers with throttled parameter updates
  // If fmt is not provided, use displayFormat from parameter registry
  const bind = (id, param, fmt) => {
    const el = byId(id);
    const val = byId(id + 'Val');
    if (!el || !val) return;

    // Get format function from parameter registry if not provided
    if (!fmt) {
      const paramDef = getParameter(param);
      fmt = paramDef?.displayFormat || ((v) => v.toString());
    }

    // Throttle parameter updates to 16ms (~60fps)
    const throttledSetParam = throttle((value) => {
      synth.setParam(param, value);
    }, 16);

    const apply = (v) => {
      const numValue = +v; // Convert to number first
      val.textContent = fmt(numValue);
      throttledSetParam(numValue);
    };
    apply(el.value);
    el.addEventListener('input', (e) => {
      apply(e.target.value);
    });
    // Prevent sliders from being focusable (keyboard is for synth notes only)
    el.setAttribute('tabindex', '-1');
    el.addEventListener('focus', (e) => {
      e.target.blur(); // Immediately blur if somehow focused
    });
  };

  bind('coarse', 'oscillatorCoarseTune');
  bind('fine', 'oscillatorFineTune');
  bind('oscVolume', 'oscillatorVolume');
  bind('pulseWidth', 'pulseWidth');
  bind('pwmDepth', 'pulseWidthModulationDepth');
  bind('pwmRate', 'pulseWidthModulationRate');
  bind('subVolume', 'subOscillatorVolume');
  bind('fmDepth', 'frequencyModulationDepth');

  // Oscillator 2 waveform uses 'change' event instead of 'input'
  const osc2WaveformEl = byId('osc2Waveform');
  const osc2WaveformVal = byId('osc2WaveformVal');
  if (osc2WaveformEl && osc2WaveformVal) {
    const paramDef = getParameter('oscillator2Waveform');
    const fmt = paramDef?.displayFormat || ((v) => 'Saw');
    const applyOsc2Waveform = (v) => {
      const idx = Math.round(+v);
      osc2WaveformVal.textContent = fmt(idx);
      synth.setParam('oscillator2Waveform', idx);
    };
    applyOsc2Waveform(osc2WaveformEl.value);
    osc2WaveformEl.addEventListener('change', (e) =>
      applyOsc2Waveform(e.target.value)
    );
  }

  bind('osc2Coarse', 'oscillator2CoarseTune');
  bind('osc2Fine', 'oscillator2FineTune');
  bind('osc2Volume', 'oscillator2Volume');
  bind('sub2Volume', 'subOscillator2Volume');
  bind('hardSync', 'oscillator2HardSync');
  bind('ringVolume', 'ringModulatorVolume');
  bind('noiseVolume', 'noiseVolume');
  bind('panPos', 'panningPosition');
  bind('panDepth', 'panningModulationDepth');
  bind('panRate', 'panningModulationRate');
  bind('attack', 'envelopeAttack');
  bind('decay', 'envelopeDecay');
  bind('sustain', 'envelopeSustain');
  bind('release', 'envelopeRelease');
  bind('velocityAmt', 'velocityAmount');
  bind('master', 'masterVolume');

  // Filter envelope controls
  bind('filterAttack', 'filterEnvAttack');
  bind('filterDecay', 'filterEnvDecay');
  bind('filterSustain', 'filterEnvSustain');
  bind('filterRelease', 'filterEnvRelease');
  // LP/HP envelope amount: UI is -100 to +100, synth is -1.0 to +1.0
  const bindEnvAmount = (id, param) => {
    const el = byId(id);
    const val = byId(id + 'Val');
    if (!el || !val) return;

    const throttledSetParam = throttle((value) => {
      synth.setParam(param, value / 100.0);
    }, 16);

    const apply = (v) => {
      const percent = Math.round(+v);
      val.textContent = percent;
      throttledSetParam(+v);
    };
    apply(el.value);
    el.addEventListener('input', (e) => apply(e.target.value));
  };
  bindEnvAmount('lpEnvAmount', 'lpEnvAmount');
  bindEnvAmount('hpEnvAmount', 'hpEnvAmount');
  // Exponential filter cutoff mapping (20Hz - 20kHz)
  const bindExpFilter = (id, param, fmt, gentle = false) => {
    const el = byId(id);
    const val = byId(id + 'Val');
    if (!el || !val) return;

    const throttledSetParam = throttle((expValue) => {
      synth.setParam(param, expValue);
    }, 16);

    const apply = (sliderValue) => {
      const minFreq = 20;
      const maxFreq = 20000;
      let expValue;

      if (gentle) {
        // Gentler curve for lowpass: mix linear and exponential
        const linearPart = minFreq + (maxFreq - minFreq) * sliderValue;
        const expPart = minFreq * Math.pow(maxFreq / minFreq, sliderValue);
        // Blend: 60% linear + 40% exponential for more usable range
        expValue = 0.6 * linearPart + 0.4 * expPart;
      } else {
        // Full exponential for highpass
        expValue = minFreq * Math.pow(maxFreq / minFreq, sliderValue);
      }

      val.textContent = fmt(expValue);
      throttledSetParam(expValue);
    };
    apply(el.value);
    el.addEventListener('input', (e) => apply(e.target.value));
  };

  bindExpFilter('filterCutoff', 'filterCutoff', (v) => Math.round(v), true); // gentle=true
  bind('filterResonance', 'filterResonance');
  bindExpFilter('hpfCutoff', 'hpfCutoff', (v) => Math.round(v));
  bind('hpfResonance', 'hpfResonance');

  // Aftertouch modulation slots (use parameter registry for formatting)
  bind('atDest1', 'aftertouchDest1');
  bind('atAmount1', 'aftertouchAmount1');
  bind('atDest2', 'aftertouchDest2');
  bind('atAmount2', 'aftertouchAmount2');
  bind('atDest3', 'aftertouchDest3');
  bind('atAmount3', 'aftertouchAmount3');
  bind('atDest4', 'aftertouchDest4');
  bind('atAmount4', 'aftertouchAmount4');
}
