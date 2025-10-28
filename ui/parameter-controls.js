// ui/parameter-controls.js - synth parameter sliders and controls

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
  const bind = (id, param, fmt = (v) => v.toString()) => {
    const el = byId(id);
    const val = byId(id + 'Val');
    if (!el || !val) return;

    // Throttle parameter updates to 16ms (~60fps)
    const throttledSetParam = throttle((value) => {
      synth.setParam(param, value);
    }, 16);

    const apply = (v) => {
      val.textContent = fmt(v);
      throttledSetParam(+v);
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

  bind('coarse', 'oscillatorCoarseTune', (v) => Math.round(+v));
  bind('fine', 'oscillatorFineTune', (v) => Math.round(+v));
  bind('oscVolume', 'oscillatorVolume', (v) => Math.round(+v * 100));
  bind('pulseWidth', 'pulseWidth', (v) => Math.round(+v * 100));
  bind('pwmDepth', 'pulseWidthModulationDepth', (v) => Math.round(+v * 100));
  bind('pwmRate', 'pulseWidthModulationRate', (v) => (+v).toFixed(2));
  bind('subVolume', 'subOscillatorVolume', (v) => Math.round(+v * 100));
  bind('fmDepth', 'frequencyModulationDepth', (v) => Math.round(+v * 100));

  // Oscillator 2 controls
  const osc2WaveformEl = byId('osc2Waveform');
  const osc2WaveformVal = byId('osc2WaveformVal');
  if (osc2WaveformEl && osc2WaveformVal) {
    const waveformNames = ['Saw', 'Triangle', 'Sine', 'Square'];
    const applyOsc2Waveform = (v) => {
      const idx = Math.round(+v);
      osc2WaveformVal.textContent = waveformNames[idx] || 'Saw';
      synth.setParam('oscillator2Waveform', idx);
    };
    applyOsc2Waveform(osc2WaveformEl.value);
    osc2WaveformEl.addEventListener('change', (e) =>
      applyOsc2Waveform(e.target.value)
    );
  }

  bind('osc2Coarse', 'oscillator2CoarseTune', (v) => Math.round(+v));
  bind('osc2Fine', 'oscillator2FineTune', (v) => Math.round(+v));
  bind('osc2Volume', 'oscillator2Volume', (v) => Math.round(+v * 100));
  bind('sub2Volume', 'subOscillator2Volume', (v) => Math.round(+v * 100));
  bind('hardSync', 'oscillator2HardSync', (v) => (+v > 0 ? 'On' : 'Off'));
  bind('ringVolume', 'ringModulatorVolume', (v) => Math.round(+v * 100));
  bind('noiseVolume', 'noiseVolume', (v) => Math.round(+v * 100));
  bind('panPos', 'panningPosition', (v) => {
    const f = +v;
    return `${(f * 100).toFixed(0)}%`;
  });
  bind('panDepth', 'panningModulationDepth', (v) => Math.round(+v * 100));
  bind('panRate', 'panningModulationRate', (v) => (+v).toFixed(2));
  bind('attack', 'envelopeAttack', (v) => Math.round(+v * 1000));
  bind('decay', 'envelopeDecay', (v) => Math.round(+v * 1000));
  bind('sustain', 'envelopeSustain', (v) => Math.round(+v * 100));
  bind('release', 'envelopeRelease', (v) => Math.round(+v * 1000));
  bind('velocityAmt', 'velocityAmount', (v) => Math.round(+v * 100));
  bind('master', 'masterVolume', (v) => Math.round(+v * 100));

  // Filter envelope controls
  bind('filterAttack', 'filterEnvAttack', (v) => Math.round(+v * 1000));
  bind('filterDecay', 'filterEnvDecay', (v) => Math.round(+v * 1000));
  bind('filterSustain', 'filterEnvSustain', (v) => Math.round(+v * 100));
  bind('filterRelease', 'filterEnvRelease', (v) => Math.round(+v * 1000));
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
  bind('filterResonance', 'filterResonance', (v) => Math.round(+v * 100));
  bindExpFilter('hpfCutoff', 'hpfCutoff', (v) => Math.round(v));
  bind('hpfResonance', 'hpfResonance', (v) => Math.round(+v * 100));

  // Aftertouch destination formatter
  const destNames = [
    'None',
    'O1Pitch',
    'O1Vol',
    'Sub1Vol',
    'O1PW',
    'PWMRate',
    'FMDepth',
    'O2Pitch',
    'O2Vol',
    'Sub2Vol',
    'RingVol',
    'NoiseMix',
    'LPCut',
    'LPRes',
    'HPCut',
    'HPRes',
    'PanDepth',
    'PanRate',
  ];
  const fmtDest = (v) => destNames[Math.round(+v)] || 'None';

  // Aftertouch modulation slots
  bind('atDest1', 'aftertouchDest1', fmtDest);
  bind('atAmount1', 'aftertouchAmount1', (v) => (+v).toFixed(2));
  bind('atDest2', 'aftertouchDest2', fmtDest);
  bind('atAmount2', 'aftertouchAmount2', (v) => (+v).toFixed(2));
  bind('atDest3', 'aftertouchDest3', fmtDest);
  bind('atAmount3', 'aftertouchAmount3', (v) => (+v).toFixed(2));
  bind('atDest4', 'aftertouchDest4', fmtDest);
  bind('atAmount4', 'aftertouchAmount4', (v) => (+v).toFixed(2));
}
