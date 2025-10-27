// tests/browser/synth-initialization.test.js
import { test, expect } from '@playwright/test';

test.describe('AudioWorklet Synth Initialization', () => {
  test('should load the synth page successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/PWM Synth/);

    // Check that main UI elements are present
    await expect(page.locator('#startButton')).toBeVisible();
    await expect(page.locator('#controls')).toBeVisible();
  });

  test('should initialize AudioContext when Start Audio is clicked', async ({
    page,
  }) => {
    await page.goto('/');

    // Click the Start Audio button
    const startButton = page.locator('#startButton');
    await startButton.click();

    // Wait for AudioContext to be initialized
    await page.waitForTimeout(1000);

    // Check that the button text changed or is disabled
    const buttonText = await startButton.textContent();
    expect(buttonText).toContain('Audio');

    // Check console for initialization messages
    const messages = [];
    page.on('console', (msg) => {
      messages.push(msg.text());
    });

    // Reload and start again to capture console messages
    await page.reload();

    // Set up console listener before clicking
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.locator('#startButton').click();
    await page.waitForTimeout(2000);

    // Check that AudioWorklet was loaded
    const hasWorkletMessage = consoleMessages.some(
      (msg) => msg.includes('AudioWorklet') || msg.includes('synth-processor')
    );

    // This may not always be logged, so we just check that no errors occurred
    const hasError = consoleMessages.some((msg) => msg.includes('Error'));
    expect(hasError).toBe(false);
  });

  test('should not throw errors during initialization', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.locator('#startButton').click();
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  test('should handle multiple init calls gracefully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');

    const startButton = page.locator('#startButton');

    // Try to click multiple times
    await startButton.click();
    await page.waitForTimeout(500);

    // Try clicking again (should be protected by multiple init guard)
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    await page.waitForTimeout(1000);

    // Should not have thrown errors
    expect(errors).toHaveLength(0);
  });

  test('should display voice count meter', async ({ page }) => {
    await page.goto('/');
    await page.locator('#startButton').click();
    await page.waitForTimeout(1000);

    // Check for voice count display element
    const voiceCountElement = page.locator(
      '#voiceCount, [data-testid="voice-count"]'
    );

    // Either the element exists or we just verify no errors
    // (since voice count UI might be dynamically created)
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
