// ui/parameter-controls.js - synth parameter sliders and controls
import { getParameter } from '../utils/parameter-registry.js';

export function initParameterControls(synth, tempoManager = null) {
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
    if (!el) return;

    // Check if this is a select element (source/dest dropdowns don't need Val spans)
    const isSelect = el.tagName === 'SELECT';
    const val = isSelect ? null : byId(id + 'Val');

    // For non-select elements, we need the Val span
    if (!isSelect && !val) return;

    // Get format function from parameter registry if not provided
    if (!fmt && !isSelect) {
      const paramDef = getParameter(param);
      fmt = paramDef?.displayFormat || ((v) => v.toString());
    }

    // Throttle parameter updates to 16ms (~60fps)
    const throttledSetParam = throttle((value) => {
      synth.setParam(param, value);
    }, 16);

    const apply = (v) => {
      const numValue = +v; // Convert to number first
      if (val) {
        val.textContent = fmt(numValue);
      }
      throttledSetParam(numValue);
    };
    apply(el.value);

    // Use 'change' event for selects, 'input' for range sliders
    const eventType = isSelect ? 'change' : 'input';
    el.addEventListener(eventType, (e) => {
      apply(e.target.value);
    });

    // Prevent sliders from being focusable (keyboard is for synth notes only)
    el.setAttribute('tabindex', '-1');
    el.addEventListener('focus', (e) => {
      e.target.blur(); // Immediately blur if somehow focused
    });
  };

  // BPM control with TempoManager integration
  if (tempoManager) {
    const bpmEl = byId('bpm');
    const bpmVal = byId('bpmVal');
    if (bpmEl && bpmVal) {
      const paramDef = getParameter('bpm');
      const fmt = paramDef?.displayFormat || ((v) => Math.round(v));

      const applyBPM = (v) => {
        const bpmValue = +v;
        bpmVal.textContent = fmt(bpmValue);
        tempoManager.setBPM(bpmValue, 'manual');
      };
      applyBPM(bpmEl.value);
      bpmEl.addEventListener('input', (e) => applyBPM(e.target.value));

      // Prevent slider from being focusable
      bpmEl.setAttribute('tabindex', '-1');
      bpmEl.addEventListener('focus', (e) => e.target.blur());
    }
  }

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

  // Modulation Matrix (12 slots)
  for (let i = 1; i <= 12; i++) {
    bind(`matrixSource${i}`, `matrixSource${i}`);
    bind(`matrixDest${i}`, `matrixDest${i}`);
    bind(`matrixAmount${i}`, `matrixAmount${i}`);
  }

  // LFO1 parameters
  bind('lfo1Rate', 'lfo1Rate');
  bind('lfo1Depth', 'lfo1Depth');

  // LFO1 waveform selector (uses 'change' event like osc2Waveform)
  const lfo1WaveformEl = byId('lfo1Waveform');
  const lfo1WaveformVal = byId('lfo1WaveformVal');
  if (lfo1WaveformEl && lfo1WaveformVal) {
    const paramDef = getParameter('lfo1Waveform');
    const fmt = paramDef?.displayFormat || ((v) => 'Sine');
    const applyLFO1Waveform = (v) => {
      const idx = Math.round(+v);
      lfo1WaveformVal.textContent = fmt(idx);
      synth.setParam('lfo1Waveform', idx);
    };
    applyLFO1Waveform(lfo1WaveformEl.value);
    lfo1WaveformEl.addEventListener('change', (e) =>
      applyLFO1Waveform(e.target.value)
    );
  }

  bind('lfo1Phase', 'lfo1Phase');
  bind('lfo1TempoSync', 'lfo1TempoSync');

  // LFO1 sync division selector (uses 'change' event)
  const lfo1SyncDivisionEl = byId('lfo1SyncDivision');
  const lfo1SyncDivisionVal = byId('lfo1SyncDivisionVal');
  if (lfo1SyncDivisionEl && lfo1SyncDivisionVal) {
    const paramDef = getParameter('lfo1SyncDivision');
    const fmt = paramDef?.displayFormat || ((v) => '1/4');
    const applyLFO1SyncDivision = (v) => {
      const idx = Math.round(+v);
      lfo1SyncDivisionVal.textContent = fmt(idx);
      synth.setParam('lfo1SyncDivision', idx);
    };
    applyLFO1SyncDivision(lfo1SyncDivisionEl.value);
    lfo1SyncDivisionEl.addEventListener('change', (e) =>
      applyLFO1SyncDivision(e.target.value)
    );
  }

  bind('lfo1Retrigger', 'lfo1Retrigger');
  bind('lfo1FadeIn', 'lfo1FadeIn');

  // LFO2 parameters
  bind('lfo2Rate', 'lfo2Rate');
  bind('lfo2Depth', 'lfo2Depth');

  // LFO2 waveform selector (uses 'change' event like osc2Waveform)
  const lfo2WaveformEl = byId('lfo2Waveform');
  const lfo2WaveformVal = byId('lfo2WaveformVal');
  if (lfo2WaveformEl && lfo2WaveformVal) {
    const paramDef = getParameter('lfo2Waveform');
    const fmt = paramDef?.displayFormat || ((v) => 'Sine');
    const applyLFO2Waveform = (v) => {
      const idx = Math.round(+v);
      lfo2WaveformVal.textContent = fmt(idx);
      synth.setParam('lfo2Waveform', idx);
    };
    applyLFO2Waveform(lfo2WaveformEl.value);
    lfo2WaveformEl.addEventListener('change', (e) =>
      applyLFO2Waveform(e.target.value)
    );
  }

  bind('lfo2Phase', 'lfo2Phase');
  bind('lfo2TempoSync', 'lfo2TempoSync');

  // LFO2 sync division selector (uses 'change' event)
  const lfo2SyncDivisionEl = byId('lfo2SyncDivision');
  const lfo2SyncDivisionVal = byId('lfo2SyncDivisionVal');
  if (lfo2SyncDivisionEl && lfo2SyncDivisionVal) {
    const paramDef = getParameter('lfo2SyncDivision');
    const fmt = paramDef?.displayFormat || ((v) => '1/4');
    const applyLFO2SyncDivision = (v) => {
      const idx = Math.round(+v);
      lfo2SyncDivisionVal.textContent = fmt(idx);
      synth.setParam('lfo2SyncDivision', idx);
    };
    applyLFO2SyncDivision(lfo2SyncDivisionEl.value);
    lfo2SyncDivisionEl.addEventListener('change', (e) =>
      applyLFO2SyncDivision(e.target.value)
    );
  }

  bind('lfo2Retrigger', 'lfo2Retrigger');
  bind('lfo2FadeIn', 'lfo2FadeIn');
}
