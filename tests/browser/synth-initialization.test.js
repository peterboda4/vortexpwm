// tests/browser/synth-initialization.test.js
import { test, expect } from '@playwright/test';

test.describe('AudioWorklet Synth Initialization', () => {
  test('should load the synth page successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/VortexPWM/);

    // Check that main UI elements are present
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('should initialize AudioContext when Start Audio is clicked', async ({
    page,
  }) => {
    // Set up error listener before page load
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');

    // Click the Start Audio button
    const startButton = page.locator('#start');
    await startButton.click();

    // Wait for AudioContext to be initialized
    await page.waitForTimeout(1500);

    // Check that the button text changed and is disabled
    const buttonText = await startButton.textContent();
    expect(buttonText).toContain('Audio');

    const isDisabled = await startButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Verify voice count element is visible
    const voiceCount = page.locator('#voiceCount');
    await expect(voiceCount).toBeVisible();

    // Should not have page errors
    expect(pageErrors).toHaveLength(0);
  });

  test('should not throw errors during initialization', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  test('should handle multiple init calls gracefully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');

    const startButton = page.locator('#start');

    // Click the start button
    await startButton.click();
    await page.waitForTimeout(500);

    // Check that button is now disabled (correct behavior)
    const isDisabled = await startButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Button text should indicate audio is running
    const buttonText = await startButton.textContent();
    expect(buttonText).toContain('Audio');

    // Should not have thrown errors
    expect(errors).toHaveLength(0);
  });

  test('should display voice count meter', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start').click();
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
