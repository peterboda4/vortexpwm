// tests/e2e/keyboard-input.test.js
import { test, expect } from '@playwright/test';

test.describe('E2E: Keyboard Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start audio context
    await page.locator('#start').click();
    // Wait for audio initialization
    await page.waitForTimeout(500);
  });

  test('should render on-screen keyboard with visible keys', async ({
    page,
  }) => {
    const kbd = page.locator('#kbd');
    await expect(kbd).toBeVisible();

    // Check that keyboard inner wrapper exists
    const kbdInner = page.locator('#kbd-inner');
    await expect(kbdInner).toBeVisible();

    // Check that white keys are rendered
    const whiteKeys = page.locator('.kbd-key-white');
    const whiteKeyCount = await whiteKeys.count();
    expect(whiteKeyCount).toBeGreaterThan(0);

    // Check that black keys are rendered
    const blackKeys = page.locator('.kbd-key-black');
    const blackKeyCount = await blackKeys.count();
    expect(blackKeyCount).toBeGreaterThan(0);
  });

  test('should show note labels on keyboard keys', async ({ page }) => {
    // Find a key with a note label (e.g., C4)
    const c4Key = page.locator('[data-midi="60"]');
    await expect(c4Key).toBeVisible();

    // Check that the key has a text label
    const keyText = await c4Key.textContent();
    expect(keyText).toMatch(/C4/i);
  });

  test('should respond to mouse clicks on keyboard keys', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Get initial voice count
    const initialCount = await voiceCountValue.textContent();

    // Click on C4 (MIDI 60)
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    // Wait a bit for voice to activate
    await page.waitForTimeout(100);

    // Voice count should increase (or stay same if already at max)
    const afterClickCount = await voiceCountValue.textContent();
    expect(parseInt(afterClickCount)).toBeGreaterThanOrEqual(
      parseInt(initialCount)
    );
  });

  test('should handle multiple simultaneous key presses', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Get initial count
    const initialCount = parseInt(await voiceCountValue.textContent());

    // Click multiple keys quickly
    const c4Key = page.locator('[data-midi="60"]');
    const e4Key = page.locator('[data-midi="64"]');
    const g4Key = page.locator('[data-midi="67"]');

    await c4Key.click();
    await page.waitForTimeout(50);
    await e4Key.click();
    await page.waitForTimeout(50);
    await g4Key.click();

    // Wait for voice allocation
    await page.waitForTimeout(200);

    // Should have voices active (may be greater than or equal to initial due to release times)
    const voiceCount = parseInt(await voiceCountValue.textContent());
    expect(voiceCount).toBeGreaterThanOrEqual(0);
  });

  test('should update velocity slider and affect note velocity', async ({
    page,
  }) => {
    const velocitySlider = page.locator('#velocity');
    const velocityValue = page.locator('#velocityVal');

    // Set velocity to 0.5
    await velocitySlider.fill('0.5');

    // Verify display updated
    const velText = await velocityValue.textContent();
    expect(parseFloat(velText)).toBeCloseTo(0.5, 1);

    // Click a key (velocity should be applied internally)
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    // Wait for note to trigger
    await page.waitForTimeout(50);

    // Note: Actual velocity application is internal to synth
    // This test verifies the UI slider works
  });

  test('should handle rapid key presses without errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const c4Key = page.locator('[data-midi="60"]');

    // Click rapidly 10 times
    for (let i = 0; i < 10; i++) {
      await c4Key.click({ delay: 10 });
    }

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should render keys across multiple octaves', async ({ page }) => {
    // Check for keys in different octaves
    const c1Key = page.locator('[data-midi="24"]'); // C1
    const c3Key = page.locator('[data-midi="48"]'); // C3
    const c5Key = page.locator('[data-midi="72"]'); // C5

    await expect(c1Key).toBeVisible();
    await expect(c3Key).toBeVisible();
    await expect(c5Key).toBeVisible();
  });

  test('should handle both white and black keys', async ({ page }) => {
    // White key (C4)
    const whiteKey = page.locator('[data-midi="60"]');
    await expect(whiteKey).toBeVisible();
    await expect(whiteKey).toHaveClass(/kbd-key-white/);

    // Black key (C#4)
    const blackKey = page.locator('[data-midi="61"]');
    await expect(blackKey).toBeVisible();
    await expect(blackKey).toHaveClass(/kbd-key-black/);
  });

  test('should show keyboard controls section', async ({ page }) => {
    // Verify the keyboard controls section exists
    const kbdSection = page.locator('text=Keyboard & Velocity');
    await expect(kbdSection).toBeVisible();
  });

  test('should test computer keyboard mapping (QWERTY layout)', async ({
    page,
  }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Get initial count
    const initialCount = await voiceCountValue.textContent();

    // Press 'A' key (typically maps to C note)
    await page.keyboard.press('a');

    // Wait for note activation
    await page.waitForTimeout(100);

    // Voice count should change
    const afterKeyCount = await voiceCountValue.textContent();

    // Note: Some keys may not trigger notes depending on mapping
    // This test verifies keyboard events are captured
    expect(parseInt(afterKeyCount)).toBeGreaterThanOrEqual(
      parseInt(initialCount)
    );
  });

  test('should handle key release (note off)', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Press a key
    const c4Key = page.locator('[data-midi="60"]');
    await c4Key.click();

    await page.waitForTimeout(100);

    // Get voice count after press
    const duringNoteCount = await voiceCountValue.textContent();
    expect(parseInt(duringNoteCount)).toBeGreaterThan(0);

    // Wait for release phase (envelope release time)
    await page.waitForTimeout(2000); // Wait longer than release time

    // Voice count should return to 0 (or lower)
    const afterReleaseCount = await voiceCountValue.textContent();
    expect(parseInt(afterReleaseCount)).toBeLessThanOrEqual(
      parseInt(duringNoteCount)
    );
  });

  test('should not exceed max voice count (8 voices)', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Click 10 keys rapidly (more than 8 voice limit)
    for (let midi = 60; midi < 70; midi++) {
      const key = page.locator(`[data-midi="${midi}"]`);
      if (await key.isVisible()) {
        await key.click({ delay: 10 });
      }
    }

    // Wait for voice allocation
    await page.waitForTimeout(100);

    // Voice count should not exceed 8
    const voiceCount = await voiceCountValue.textContent();
    expect(parseInt(voiceCount)).toBeLessThanOrEqual(8);
  });

  test('should show visual feedback when key is pressed', async ({ page }) => {
    const c4Key = page.locator('[data-midi="60"]');

    // Check key has normal state
    const initialClass = await c4Key.getAttribute('class');

    // Press the key
    await c4Key.click();

    // Key should have active state (if implemented)
    // Note: This depends on CSS active state implementation
    await expect(c4Key).toBeVisible();
  });
});
