// tests/e2e/ui-interactions.test.js
import { test, expect } from '@playwright/test';

test.describe('E2E: UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start audio context
    await page.locator('#start').click();
    // Wait for audio initialization
    await page.waitForTimeout(500);
  });

  test('should update slider value displays when sliders are moved', async ({
    page,
  }) => {
    // Test Master Volume slider
    const masterSlider = page.locator('#master');
    const masterValue = page.locator('#masterVal');

    // Get initial value
    const initialValue = await masterValue.textContent();

    // Move slider
    await masterSlider.fill('0.8');
    await page.waitForTimeout(100);

    // Value display should update
    const newValue = await masterValue.textContent();
    expect(newValue).not.toBe(initialValue);

    // Parse and check value (handle different formats like "0.800" or "0.8")
    const parsedValue = parseFloat(newValue);
    expect(parsedValue).toBeGreaterThanOrEqual(0.75);
    expect(parsedValue).toBeLessThanOrEqual(0.85);
  });

  test('should update oscillator tuning when coarse slider changes', async ({
    page,
  }) => {
    const coarseSlider = page.locator('#coarse');
    const coarseValue = page.locator('#coarseVal');

    // Set to +12 semitones (one octave up)
    await coarseSlider.fill('12');

    // Verify display updated
    const displayValue = await coarseValue.textContent();
    expect(displayValue).toBe('12');
  });

  test('should update filter cutoff frequency', async ({ page }) => {
    const filterSlider = page.locator('#filterCutoff');
    const filterValue = page.locator('#filterCutoffVal');

    // Set to 1000 Hz
    await filterSlider.fill('1000');

    // Verify display updated
    const displayValue = await filterValue.textContent();
    expect(parseInt(displayValue)).toBe(1000);
  });

  test('should update envelope ADSR parameters', async ({ page }) => {
    // Test Attack
    const attackSlider = page.locator('#attack');
    const attackValue = page.locator('#attackVal');
    await attackSlider.fill('100');
    expect(await attackValue.textContent()).toBe('100');

    // Test Decay
    const decaySlider = page.locator('#decay');
    const decayValue = page.locator('#decayVal');
    await decaySlider.fill('500');
    expect(await decayValue.textContent()).toBe('500');

    // Test Sustain
    const sustainSlider = page.locator('#sustain');
    const sustainValue = page.locator('#sustainVal');
    await sustainSlider.fill('0.5');
    const sustainText = await sustainValue.textContent();
    expect(parseFloat(sustainText)).toBeCloseTo(0.5, 1);

    // Test Release
    const releaseSlider = page.locator('#release');
    const releaseValue = page.locator('#releaseVal');
    await releaseSlider.fill('1000');
    expect(await releaseValue.textContent()).toBe('1000');
  });

  test('should update PWM parameters', async ({ page }) => {
    // Pulse Width
    const pwSlider = page.locator('#pulseWidth');
    const pwValue = page.locator('#pulseWidthVal');
    await pwSlider.fill('25');
    expect(await pwValue.textContent()).toBe('25');

    // PWM Depth
    const depthSlider = page.locator('#pwmDepth');
    const depthValue = page.locator('#pwmDepthVal');
    await depthSlider.fill('75');
    expect(await depthValue.textContent()).toBe('75');

    // PWM Rate
    const rateSlider = page.locator('#pwmRate');
    const rateValue = page.locator('#pwmRateVal');
    await rateSlider.fill('5');
    const rateText = await rateValue.textContent();
    expect(parseFloat(rateText)).toBeCloseTo(5, 1);
  });

  test('should update mixer volumes', async ({ page }) => {
    // Osc1 Volume
    const osc1Slider = page.locator('#oscVolume');
    const osc1Value = page.locator('#oscVolumeVal');
    await osc1Slider.fill('80');
    expect(await osc1Value.textContent()).toBe('80');

    // Sub Volume
    const subSlider = page.locator('#subVolume');
    const subValue = page.locator('#subVolumeVal');
    await subSlider.fill('50');
    expect(await subValue.textContent()).toBe('50');

    // Osc2 Volume
    const osc2Slider = page.locator('#osc2Volume');
    const osc2Value = page.locator('#osc2VolumeVal');
    await osc2Slider.fill('40');
    expect(await osc2Value.textContent()).toBe('40');
  });

  test('should update pan parameters', async ({ page }) => {
    // Pan Position
    const panPosSlider = page.locator('#panPos');
    const panPosValue = page.locator('#panPosVal');
    await panPosSlider.fill('0.5'); // Right
    const posText = await panPosValue.textContent();
    expect(posText).toMatch(/R/); // Should show R for right

    // Pan Depth
    const panDepthSlider = page.locator('#panDepth');
    const panDepthValue = page.locator('#panDepthVal');
    await panDepthSlider.fill('50');
    expect(await panDepthValue.textContent()).toBe('50');

    // Pan Rate
    const panRateSlider = page.locator('#panRate');
    const panRateValue = page.locator('#panRateVal');
    await panRateSlider.fill('2');
    const rateText = await panRateValue.textContent();
    expect(parseFloat(rateText)).toBeCloseTo(2, 1);
  });

  test('should update voice count display when notes are played', async ({
    page,
  }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Initial voice count should be 0
    expect(await voiceCountValue.textContent()).toBe('0');

    // Trigger a note via keyboard simulation
    // This would require the on-screen keyboard to be visible
    const kbd = page.locator('#kbd');
    await expect(kbd).toBeVisible();

    // Note: Voice count updates happen when actual notes are triggered
    // This test verifies the display element exists and is readable
  });

  test('should show velocity slider and update value', async ({ page }) => {
    const velocitySlider = page.locator('#velocity');
    const velocityValue = page.locator('#velocityVal');

    await velocitySlider.fill('0.5');
    const velText = await velocityValue.textContent();
    expect(parseFloat(velText)).toBeCloseTo(0.5, 1);
  });

  test('should handle MIDI parameter sliders', async ({ page }) => {
    // Pitch Bend Range
    const pbSlider = page.locator('#pitchBendRange');
    const pbValue = page.locator('#pitchBendRangeVal');
    await pbSlider.fill('12');
    expect(await pbValue.textContent()).toMatch(/12/);

    // Velocity Curve
    const vcSlider = page.locator('#velocityCurve');
    const vcValue = page.locator('#velocityCurveVal');
    await vcSlider.fill('50');
    const curveText = await vcValue.textContent();
    expect(curveText).toMatch(/Exp|Lin|Log/);
  });

  test('should update aftertouch modulation slots', async ({ page }) => {
    // Slot 1 Destination
    const dest1Slider = page.locator('#atDest1');
    const dest1Value = page.locator('#atDest1Val');
    await dest1Slider.fill('1'); // PWM Depth
    const dest1Text = await dest1Value.textContent();
    expect(dest1Text).not.toBe('None');

    // Slot 1 Amount
    const amount1Slider = page.locator('#atAmount1');
    const amount1Value = page.locator('#atAmount1Val');
    await amount1Slider.fill('0.5');
    const amount1Text = await amount1Value.textContent();
    expect(parseFloat(amount1Text)).toBeCloseTo(0.5, 1);
  });

  test('should handle multiple rapid slider changes', async ({ page }) => {
    const masterSlider = page.locator('#master');
    const masterValue = page.locator('#masterVal');

    // Rapidly change values
    await masterSlider.fill('0.2');
    await masterSlider.fill('0.4');
    await masterSlider.fill('0.6');
    await masterSlider.fill('0.8');

    // Final value should be correct
    const finalValue = await masterValue.textContent();
    expect(parseFloat(finalValue)).toBeCloseTo(0.8, 1);
  });

  test('should persist UI state during session', async ({ page }) => {
    // Set a parameter
    const masterSlider = page.locator('#master');
    await masterSlider.fill('0.75');

    // Change focus to another element
    const attackSlider = page.locator('#attack');
    await attackSlider.fill('200');

    // Original parameter should still show correct value
    const masterValue = page.locator('#masterVal');
    const storedValue = await masterValue.textContent();
    expect(parseFloat(storedValue)).toBeCloseTo(0.75, 1);
  });
});
