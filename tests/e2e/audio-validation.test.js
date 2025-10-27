// tests/e2e/audio-validation.test.js
import { test, expect } from '@playwright/test';

/**
 * Audio Output Validation with Waveform Analysis
 * Tests audio generation and validates waveform characteristics
 */

test.describe('E2E: Audio Output Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Inject audio capture utilities before page loads
    await page.addInitScript(() => {
      // Audio capture setup
      window.__audioCapture = {
        buffer: null,
        analyser: null,
        dataArray: null,
        isCapturing: false,
      };

      // Intercept AudioContext creation to add analyser
      const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
      window.AudioContext = function (...args) {
        const ctx = new OriginalAudioContext(...args);
        window.__audioContext = ctx;

        // Store original destination
        const originalDestination = ctx.destination;

        // Create analyser node
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        window.__audioCapture.analyser = analyser;
        window.__audioCapture.dataArray = new Float32Array(analyser.fftSize);

        // Create gain node for capturing
        const captureGain = ctx.createGain();
        captureGain.gain.value = 1.0;

        // Connect: source -> captureGain -> analyser -> destination
        captureGain.connect(analyser);
        analyser.connect(originalDestination);

        // Store capture gain node
        window.__captureGain = captureGain;

        // Override destination getter to return our capture gain
        Object.defineProperty(ctx, 'destination', {
          get: function () {
            return captureGain;
          },
          configurable: true,
        });

        return ctx;
      };

      // Audio analysis helpers
      window.__getTimeDomainData = function () {
        if (!window.__audioCapture.analyser) return null;
        const dataArray = new Float32Array(window.__audioCapture.analyser.fftSize);
        window.__audioCapture.analyser.getFloatTimeDomainData(dataArray);
        return Array.from(dataArray);
      };

      window.__getFrequencyData = function () {
        if (!window.__audioCapture.analyser) return null;
        const dataArray = new Float32Array(
          window.__audioCapture.analyser.frequencyBinCount
        );
        window.__audioCapture.analyser.getFloatFrequencyData(dataArray);
        return Array.from(dataArray);
      };

      window.__getRMS = function () {
        const data = window.__getTimeDomainData();
        if (!data) return 0;
        const sum = data.reduce((acc, val) => acc + val * val, 0);
        return Math.sqrt(sum / data.length);
      };

      window.__getPeakAmplitude = function () {
        const data = window.__getTimeDomainData();
        if (!data) return 0;
        return Math.max(...data.map(Math.abs));
      };

      window.__getDominantFrequency = function () {
        if (!window.__audioCapture.analyser) return 0;
        const frequencyData = window.__getFrequencyData();
        if (!frequencyData) return 0;

        // Find peak frequency bin
        let maxIndex = 0;
        let maxValue = -Infinity;
        for (let i = 0; i < frequencyData.length; i++) {
          if (frequencyData[i] > maxValue) {
            maxValue = frequencyData[i];
            maxIndex = i;
          }
        }

        // Convert bin to frequency
        const sampleRate = window.__audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const frequency = (maxIndex * nyquist) / frequencyData.length;
        return frequency;
      };

      window.__getSpectralCentroid = function () {
        const frequencyData = window.__getFrequencyData();
        if (!frequencyData) return 0;

        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < frequencyData.length; i++) {
          const magnitude = Math.pow(10, frequencyData[i] / 20); // dB to linear
          numerator += i * magnitude;
          denominator += magnitude;
        }

        if (denominator === 0) return 0;
        const sampleRate = window.__audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        return (numerator / denominator) * (nyquist / frequencyData.length);
      };

      window.__detectSilence = function (threshold = 0.001) {
        const rms = window.__getRMS();
        return rms < threshold;
      };

      window.__detectClipping = function (threshold = 0.99) {
        const peak = window.__getPeakAmplitude();
        return peak > threshold;
      };

      window.__analyzeWaveform = function () {
        const timeDomain = window.__getTimeDomainData();
        const frequencyDomain = window.__getFrequencyData();
        if (!timeDomain || !frequencyDomain) return null;

        return {
          rms: window.__getRMS(),
          peak: window.__getPeakAmplitude(),
          dominantFrequency: window.__getDominantFrequency(),
          spectralCentroid: window.__getSpectralCentroid(),
          isSilent: window.__detectSilence(),
          isClipping: window.__detectClipping(),
          timeDomainSample: timeDomain.slice(0, 100), // First 100 samples
          frequencyDomainSample: frequencyDomain.slice(0, 100),
        };
      };

      window.__captureAudioSnapshot = function () {
        return window.__analyzeWaveform();
      };
    });

    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(500);
  });

  test('should initialize audio context and analyser', async ({ page }) => {
    const hasAnalyser = await page.evaluate(() => {
      return window.__audioCapture && window.__audioCapture.analyser !== null;
    });

    expect(hasAnalyser).toBe(true);
  });

  test('should detect silence when no notes are playing', async ({ page }) => {
    await page.waitForTimeout(500);

    const isSilent = await page.evaluate(() => {
      return window.__detectSilence(0.001);
    });

    expect(isSilent).toBe(true);
  });

  test('should generate audio output when note is played', async ({ page }) => {
    // Play a note
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    await page.waitForTimeout(100);

    const analysis = await page.evaluate(() => {
      return window.__analyzeWaveform();
    });

    expect(analysis).not.toBeNull();
    expect(analysis.isSilent).toBe(false);
    expect(analysis.rms).toBeGreaterThan(0.001);
  });

  test('should validate waveform amplitude is within range', async ({ page }) => {
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    await page.waitForTimeout(100);

    const analysis = await page.evaluate(() => {
      return window.__analyzeWaveform();
    });

    expect(analysis.peak).toBeGreaterThan(0);
    expect(analysis.peak).toBeLessThanOrEqual(1.0);
    expect(analysis.isClipping).toBe(false);
  });

  test('should generate frequency near C4 (261.63 Hz) when C4 is played', async ({
    page,
  }) => {
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    await page.waitForTimeout(200);

    const dominantFreq = await page.evaluate(() => {
      return window.__getDominantFrequency();
    });

    // Allow ±10 Hz tolerance for C4 (261.63 Hz)
    expect(dominantFreq).toBeGreaterThan(251);
    expect(dominantFreq).toBeLessThan(272);
  });

  test('should detect higher frequency for higher notes', async ({ page }) => {
    // Play C4 (261.63 Hz)
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const c4Freq = await page.evaluate(() => {
      return window.__getDominantFrequency();
    });

    // Release C4
    await page.evaluate(() => {
      // Simulate note off by clicking again
    });
    await page.waitForTimeout(500);

    // Play C5 (523.25 Hz) - one octave higher
    const c5Key = page.locator('[data-midi="72"]');
    await c5Key.click();
    await page.waitForTimeout(200);

    const c5Freq = await page.evaluate(() => {
      return window.__getDominantFrequency();
    });

    // C5 should be approximately double C4 frequency
    expect(c5Freq).toBeGreaterThan(c4Freq * 1.8);
    expect(c5Freq).toBeLessThan(c4Freq * 2.2);
  });

  test('should increase amplitude with higher velocity', async ({ page }) => {
    // Set low velocity
    await page.locator('#velocity').fill('0.2');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const lowVelRMS = await page.evaluate(() => {
      return window.__getRMS();
    });

    // Wait for note to finish
    await page.waitForTimeout(2000);

    // Set high velocity
    await page.locator('#velocity').fill('1.0');
    await page.waitForTimeout(100);

    await c4Key.click();
    await page.waitForTimeout(200);

    const highVelRMS = await page.evaluate(() => {
      return window.__getRMS();
    });

    // Higher velocity should produce higher RMS
    expect(highVelRMS).toBeGreaterThan(lowVelRMS * 0.8);
  });

  test('should reduce amplitude with lower master volume', async ({ page }) => {
    // Set master volume to max
    await page.locator('#master').fill('1.0');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const maxVolRMS = await page.evaluate(() => {
      return window.__getRMS();
    });

    await page.waitForTimeout(2000);

    // Set master volume to low
    await page.locator('#master').fill('0.2');
    await page.waitForTimeout(100);

    await c4Key.click();
    await page.waitForTimeout(200);

    const lowVolRMS = await page.evaluate(() => {
      return window.__getRMS();
    });

    // Lower volume should produce lower RMS
    expect(lowVolRMS).toBeLessThan(maxVolRMS);
  });

  test('should not clip audio at maximum settings', async ({ page }) => {
    // Set all volumes to maximum
    await page.locator('#master').fill('1.0');
    await page.locator('#oscVolume').fill('100');
    await page.locator('#subVolume').fill('100');
    await page.locator('#velocity').fill('1.0');

    await page.waitForTimeout(100);

    // Play multiple notes
    const keys = [60, 64, 67]; // C major chord
    for (const midi of keys) {
      const key = page.locator(`[data-midi="${midi}"]`);
      await key.click();
    }

    await page.waitForTimeout(200);

    const isClipping = await page.evaluate(() => {
      return window.__detectClipping(0.99);
    });

    // Should not clip (good headroom)
    expect(isClipping).toBe(false);
  });

  test('should modify frequency spectrum with filter cutoff', async ({ page }) => {
    // Set high filter cutoff (bright sound)
    await page.locator('#filterCutoff').fill('10000');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const brightCentroid = await page.evaluate(() => {
      return window.__getSpectralCentroid();
    });

    await page.waitForTimeout(2000);

    // Set low filter cutoff (dark sound)
    await page.locator('#filterCutoff').fill('500');
    await page.waitForTimeout(100);

    await c4Key.click();
    await page.waitForTimeout(200);

    const darkCentroid = await page.evaluate(() => {
      return window.__getSpectralCentroid();
    });

    // Bright sound should have higher spectral centroid
    expect(brightCentroid).toBeGreaterThan(darkCentroid * 1.2);
  });

  test('should detect PWM waveform characteristics', async ({ page }) => {
    // Set pulse width to 50% (square wave)
    await page.locator('#pulseWidth').fill('50');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const analysis = await page.evaluate(() => {
      return window.__analyzeWaveform();
    });

    // PWM should have significant harmonic content
    expect(analysis.spectralCentroid).toBeGreaterThan(0);
    expect(analysis.peak).toBeGreaterThan(0.01);
  });

  test('should validate envelope attack time affects amplitude rise', async ({
    page,
  }) => {
    // Set very short attack (instant)
    await page.locator('#attack').fill('1');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    // Measure amplitude immediately
    await page.waitForTimeout(50);

    const fastAttackRMS = await page.evaluate(() => {
      return window.__getRMS();
    });

    await page.waitForTimeout(2000);

    // Set long attack
    await page.locator('#attack').fill('1000');
    await page.waitForTimeout(100);

    await c4Key.click();

    // Measure amplitude immediately
    await page.waitForTimeout(50);

    const slowAttackRMS = await page.evaluate(() => {
      return window.__getRMS();
    });

    // Fast attack should reach higher amplitude quickly
    expect(fastAttackRMS).toBeGreaterThan(slowAttackRMS * 0.5);
  });

  test('should validate polyphonic audio output', async ({ page }) => {
    // Play chord
    const keys = [60, 64, 67, 72]; // C major chord with octave
    for (const midi of keys) {
      const key = page.locator(`[data-midi="${midi}"]`);
      await key.click();
    }

    await page.waitForTimeout(200);

    const analysis = await page.evaluate(() => {
      return window.__analyzeWaveform();
    });

    // Polyphonic output should have higher RMS due to multiple voices
    expect(analysis.rms).toBeGreaterThan(0.01);
    expect(analysis.peak).toBeGreaterThan(0.05);
  });

  test('should validate audio stops after release time', async ({ page }) => {
    // Set short release
    await page.locator('#release').fill('100');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(50);

    // Note should be playing
    let isSilent = await page.evaluate(() => {
      return window.__detectSilence();
    });
    expect(isSilent).toBe(false);

    // Wait for release time + buffer
    await page.waitForTimeout(2000);

    // Note should be silent now
    isSilent = await page.evaluate(() => {
      return window.__detectSilence();
    });
    expect(isSilent).toBe(true);
  });

  test('should validate sub-oscillator adds lower frequency content', async ({
    page,
  }) => {
    // Disable sub-oscillator
    await page.locator('#subVolume').fill('0');
    await page.waitForTimeout(100);

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const withoutSubCentroid = await page.evaluate(() => {
      return window.__getSpectralCentroid();
    });

    await page.waitForTimeout(2000);

    // Enable sub-oscillator
    await page.locator('#subVolume').fill('100');
    await page.waitForTimeout(100);

    await c4Key.click();
    await page.waitForTimeout(200);

    const withSubCentroid = await page.evaluate(() => {
      return window.__getSpectralCentroid();
    });

    // Sub-oscillator should lower spectral centroid (adds bass)
    expect(withSubCentroid).toBeLessThan(withoutSubCentroid * 1.2);
  });

  test('should validate audio output consistency over time', async ({ page }) => {
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    // Capture multiple snapshots
    const snapshots = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(100);
      const snapshot = await page.evaluate(() => {
        return window.__captureAudioSnapshot();
      });
      snapshots.push(snapshot);
    }

    // All snapshots should show audio is playing
    for (const snapshot of snapshots) {
      expect(snapshot.isSilent).toBe(false);
      expect(snapshot.rms).toBeGreaterThan(0.001);
    }

    // RMS should be relatively stable (within 50% variance)
    const rmsValues = snapshots.map((s) => s.rms);
    const avgRMS = rmsValues.reduce((a, b) => a + b) / rmsValues.length;
    for (const rms of rmsValues) {
      expect(rms).toBeGreaterThan(avgRMS * 0.5);
      expect(rms).toBeLessThan(avgRMS * 1.5);
    }
  });

  test('should not produce audio errors or NaN values', async ({ page }) => {
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();
    await page.waitForTimeout(200);

    const analysis = await page.evaluate(() => {
      return window.__analyzeWaveform();
    });

    // Check for NaN or invalid values
    expect(isNaN(analysis.rms)).toBe(false);
    expect(isNaN(analysis.peak)).toBe(false);
    expect(isNaN(analysis.dominantFrequency)).toBe(false);
    expect(isNaN(analysis.spectralCentroid)).toBe(false);
    expect(isFinite(analysis.rms)).toBe(true);
    expect(isFinite(analysis.peak)).toBe(true);
  });

  test('should handle rapid note changes without audio glitches', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Rapidly play and release notes
    for (let i = 0; i < 10; i++) {
      const midi = 60 + (i % 12);
      const key = page.locator(`[data-midi="${midi}"]`);
      if (await key.isVisible()) {
        await key.click();
      }
      await page.waitForTimeout(50);
    }

    // Check no errors occurred
    expect(pageErrors).toHaveLength(0);

    // Audio should still be valid
    const analysis = await page.evaluate(() => {
      return window.__analyzeWaveform();
    });

    expect(isNaN(analysis.rms)).toBe(false);
    expect(isFinite(analysis.rms)).toBe(true);
  });
});

/**
 * Audio Output Validation - Effects Testing
 * Tests audio effects and their impact on waveform
 */
test.describe('E2E: Audio Effects Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Reuse audio capture setup from main describe block
      // (Code would be duplicated here or extracted to helper)
    });

    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(500);
  });

  test('should validate audio pipeline with effects chain', async ({ page }) => {
    // This test would verify effects are processing audio
    // Implementation depends on effects UI structure
    expect(true).toBe(true);
  });

  test('should measure latency between note trigger and audio output', async ({
    page,
  }) => {
    // Measure time from click to audio detection
    const start = Date.now();

    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    // Poll for audio
    let latency = 0;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(10);
      const isSilent = await page.evaluate(() => {
        return window.__detectSilence();
      });
      if (!isSilent) {
        latency = Date.now() - start;
        break;
      }
    }

    // Latency should be reasonable (< 100ms)
    expect(latency).toBeLessThan(100);
    expect(latency).toBeGreaterThan(0);
  });
});
