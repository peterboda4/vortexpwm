// tests/e2e/effects-chain-simple.test.js
// Simplified effects chain tests focusing on what's actually testable
import { test, expect } from '@playwright/test';

test.describe('E2E: Effects Chain (Simplified)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(500);
  });

  test('should display effects library with 11 effects', async ({ page }) => {
    const fxLibrary = page.locator('#fx-library');
    await expect(fxLibrary).toBeVisible();

    const effectItems = page.locator('.fx-library-item');
    const itemCount = await effectItems.count();
    expect(itemCount).toBe(11);
  });

  test('should display effects chain container', async ({ page }) => {
    const fxChain = page.locator('#fx-chain');
    await expect(fxChain).toBeVisible();
  });

  test('should show empty state when no effects are active', async ({
    page,
  }) => {
    const emptyState = page.locator('.fx-empty-state');
    await expect(emptyState).toBeVisible();
  });

  test('should have draggable effect items', async ({ page }) => {
    const firstEffect = page.locator('.fx-library-item').first();
    const draggableAttr = await firstEffect.getAttribute('draggable');
    expect(draggableAttr).toBe('true');
  });

  test('should display all 11 effect names', async ({ page }) => {
    const effectNames = [
      'Stereo Delay',
      'Reverb',
      'Chorus',
      'Flanger',
      'Phaser',
      'Tremolo',
      'Auto-Wah',
      'BitCrusher',
      'Hard Clip',
      'Freq Shifter',
      'Pitch Shifter',
    ];

    for (const name of effectNames) {
      const effectItem = page.locator('.fx-library-item', { hasText: name });
      await expect(effectItem).toBeVisible();
    }
  });

  test('should have data-effect-id attributes', async ({ page }) => {
    const delayEffect = page.locator(
      '.fx-library-item[data-effect-id="delay"]'
    );
    await expect(delayEffect).toBeVisible();

    const reverbEffect = page.locator(
      '.fx-library-item[data-effect-id="reverb"]'
    );
    await expect(reverbEffect).toBeVisible();
  });
});
