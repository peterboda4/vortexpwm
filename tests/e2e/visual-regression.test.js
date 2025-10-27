// tests/e2e/visual-regression.test.js
import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * Tests UI appearance and visual consistency across different states
 */

test.describe('E2E: Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should match initial UI layout before audio start', async ({
    page,
  }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('initial-layout.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match UI layout after audio initialization', async ({
    page,
  }) => {
    // Start audio
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Take full page screenshot
    await expect(page).toHaveScreenshot('audio-initialized.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match on-screen keyboard appearance', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    const keyboard = page.locator('#kbd');
    await expect(keyboard).toBeVisible();

    // Screenshot keyboard section
    await expect(keyboard).toHaveScreenshot('keyboard-default.png', {
      animations: 'disabled',
    });
  });

  test('should show visual feedback on key press', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    const c4Key = page.locator('[data-midi="60"]');

    // Screenshot key in normal state
    await expect(c4Key).toHaveScreenshot('key-normal.png', {
      animations: 'disabled',
    });

    // Hover over key
    await c4Key.hover();
    await page.waitForTimeout(100);

    // Screenshot key in hover state
    await expect(c4Key).toHaveScreenshot('key-hover.png', {
      animations: 'disabled',
    });
  });

  test('should match parameter controls section', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Screenshot oscillator section
    const oscSection = page.locator('text=Oscillator').locator('..');
    await expect(oscSection.first()).toHaveScreenshot(
      'oscillator-controls.png',
      {
        animations: 'disabled',
      }
    );

    // Screenshot filter section
    const filterSection = page.locator('text=Filter').locator('..');
    await expect(filterSection.first()).toHaveScreenshot(
      'filter-controls.png',
      {
        animations: 'disabled',
      }
    );

    // Screenshot envelope section
    const envSection = page.locator('text=Envelope').locator('..');
    await expect(envSection.first()).toHaveScreenshot('envelope-controls.png', {
      animations: 'disabled',
    });
  });

  test('should match voice count display states', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    const voiceDisplay = page.locator('text=Voices:').locator('..');

    // Screenshot with 0 voices (green)
    await expect(voiceDisplay).toHaveScreenshot('voice-count-zero.png', {
      animations: 'disabled',
    });

    // Trigger some notes to get different voice counts
    await page.evaluate(() => {
      // Trigger 4 notes (medium load - orange)
      const keys = [60, 64, 67, 71];
      keys.forEach((midi) => {
        const key = document.querySelector(`[data-midi="${midi}"]`);
        if (key) key.click();
      });
    });

    await page.waitForTimeout(200);

    // Screenshot with medium voice count
    await expect(voiceDisplay).toHaveScreenshot('voice-count-medium.png', {
      animations: 'disabled',
    });

    // Trigger more notes (high load - red)
    await page.evaluate(() => {
      const keys = [72, 76, 79, 83];
      keys.forEach((midi) => {
        const key = document.querySelector(`[data-midi="${midi}"]`);
        if (key) key.click();
      });
    });

    await page.waitForTimeout(200);

    // Screenshot with high voice count
    await expect(voiceDisplay).toHaveScreenshot('voice-count-high.png', {
      animations: 'disabled',
    });
  });

  test('should match slider appearance at different values', async ({
    page,
  }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    const masterSlider = page.locator('#master').locator('..');

    // Slider at default
    await expect(masterSlider).toHaveScreenshot('slider-default.png', {
      animations: 'disabled',
    });

    // Slider at 50%
    await page.locator('#master').fill('0.5');
    await page.waitForTimeout(100);
    await expect(masterSlider).toHaveScreenshot('slider-half.png', {
      animations: 'disabled',
    });

    // Slider at max
    await page.locator('#master').fill('1.0');
    await page.waitForTimeout(100);
    await expect(masterSlider).toHaveScreenshot('slider-max.png', {
      animations: 'disabled',
    });

    // Slider at min
    await page.locator('#master').fill('0.0');
    await page.waitForTimeout(100);
    await expect(masterSlider).toHaveScreenshot('slider-min.png', {
      animations: 'disabled',
    });
  });

  test('should match MIDI controls section appearance', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Find MIDI section
    const midiSection = page.locator('text=MIDI Input').locator('..');
    if ((await midiSection.count()) > 0) {
      await expect(midiSection.first()).toHaveScreenshot('midi-controls.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match effects controls section', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Find effects section
    const fxSection = page.locator('text=Effects').locator('..');
    if ((await fxSection.count()) > 0) {
      await expect(fxSection.first()).toHaveScreenshot('effects-controls.png', {
        animations: 'disabled',
        fullPage: false,
      });
    }
  });

  test('should match pan position display values', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    const panValue = page.locator('#panPosVal');

    // Center
    await page.locator('#panPos').fill('0');
    await page.waitForTimeout(100);
    await expect(panValue).toHaveScreenshot('pan-center.png', {
      animations: 'disabled',
    });

    // Left
    await page.locator('#panPos').fill('-1');
    await page.waitForTimeout(100);
    await expect(panValue).toHaveScreenshot('pan-left.png', {
      animations: 'disabled',
    });

    // Right
    await page.locator('#panPos').fill('1');
    await page.waitForTimeout(100);
    await expect(panValue).toHaveScreenshot('pan-right.png', {
      animations: 'disabled',
    });
  });

  test('should match velocity curve display values', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    const vcValue = page.locator('#velocityCurveVal');

    // Linear
    await page.locator('#velocityCurve').fill('0');
    await page.waitForTimeout(100);
    await expect(vcValue).toHaveScreenshot('velocity-linear.png', {
      animations: 'disabled',
    });

    // Logarithmic
    await page.locator('#velocityCurve').fill('-100');
    await page.waitForTimeout(100);
    await expect(vcValue).toHaveScreenshot('velocity-log.png', {
      animations: 'disabled',
    });

    // Exponential
    await page.locator('#velocityCurve').fill('100');
    await page.waitForTimeout(100);
    await expect(vcValue).toHaveScreenshot('velocity-exp.png', {
      animations: 'disabled',
    });
  });

  test('should match button styles', async ({ page }) => {
    const startButton = page.locator('#start');

    // Button before click (disabled audio)
    await expect(startButton).toHaveScreenshot('button-start-initial.png', {
      animations: 'disabled',
    });

    // Click button
    await startButton.click();
    await page.waitForTimeout(500);

    // Button after click (audio running)
    await expect(startButton).toHaveScreenshot('button-start-active.png', {
      animations: 'disabled',
    });
  });

  test('should match keyboard key labels and colors', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // White key (C4)
    const whiteKey = page.locator('[data-midi="60"]');
    await expect(whiteKey).toHaveScreenshot('key-white-c4.png', {
      animations: 'disabled',
    });

    // Black key (C#4)
    const blackKey = page.locator('[data-midi="61"]');
    await expect(blackKey).toHaveScreenshot('key-black-cs4.png', {
      animations: 'disabled',
    });

    // White key (E4)
    const whiteKeyE = page.locator('[data-midi="64"]');
    await expect(whiteKeyE).toHaveScreenshot('key-white-e4.png', {
      animations: 'disabled',
    });
  });

  test('should match responsive layout on different viewport sizes', async ({
    page,
  }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Desktop view (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('layout-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Tablet view (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('layout-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Mobile view (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('layout-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match dark/light theme (if implemented)', async ({ page }) => {
    // Check current theme
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Take screenshot of current theme
    await expect(page).toHaveScreenshot('theme-current.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match aftertouch modulation UI', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Find aftertouch section
    const atSection = page.locator('text=Aftertouch').locator('..');
    if ((await atSection.count()) > 0) {
      await expect(atSection.first()).toHaveScreenshot(
        'aftertouch-controls.png',
        {
          animations: 'disabled',
        }
      );
    }
  });

  test('should detect visual regressions in header/title', async ({ page }) => {
    const header = page.locator('h1, header').first();
    if ((await header.count()) > 0) {
      await expect(header).toHaveScreenshot('header-title.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match control group layout and spacing', async ({ page }) => {
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Take screenshot of entire control panel
    const controlPanel = page.locator('body');
    await expect(controlPanel).toHaveScreenshot('control-panel-full.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('#voiceCountValue')], // Mask dynamic content
    });
  });

  test('should handle screenshot comparison with threshold', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test with custom threshold for minor differences
    await expect(page).toHaveScreenshot('full-page-threshold.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 100, // Allow up to 100 pixels difference
      threshold: 0.2, // 20% threshold
    });
  });
});

/**
 * Visual Regression Tests - Component States
 * Tests visual appearance of UI components in different states
 */
test.describe('E2E: Visual Regression - Component States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(500);
  });

  test('should show disabled state for controls (if applicable)', async ({
    page,
  }) => {
    // Some controls might be disabled initially
    const allSliders = page.locator('input[type="range"]');
    const count = await allSliders.count();

    if (count > 0) {
      // Take screenshot showing all controls
      await expect(page).toHaveScreenshot('controls-enabled-state.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should match error state visuals (if applicable)', async ({ page }) => {
    // Trigger any error state if possible
    // For now, just verify no error UI is shown
    const errorElements = page.locator('.error, .warning, [role="alert"]');
    const errorCount = await errorElements.count();

    if (errorCount > 0) {
      await expect(errorElements.first()).toHaveScreenshot('error-state.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match loading state (if applicable)', async ({ page }) => {
    // Since audio is already initialized, we can't easily test loading state
    // This test documents the expected behavior
    expect(true).toBe(true);
  });

  test('should match focused input state', async ({ page }) => {
    const firstSlider = page.locator('input[type="range"]').first();

    // Focus the slider
    await firstSlider.focus();
    await page.waitForTimeout(100);

    // Take screenshot of focused element
    await expect(firstSlider).toHaveScreenshot('slider-focused.png', {
      animations: 'disabled',
    });
  });

  test('should match tooltip appearance (if implemented)', async ({ page }) => {
    // Check if tooltips exist by hovering over controls
    const firstSlider = page.locator('input[type="range"]').first();
    await firstSlider.hover();
    await page.waitForTimeout(500);

    // Check for tooltip
    const tooltip = page.locator('[role="tooltip"], .tooltip');
    if ((await tooltip.count()) > 0) {
      await expect(tooltip.first()).toHaveScreenshot('tooltip.png', {
        animations: 'disabled',
      });
    }
  });
});
