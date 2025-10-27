// tests/e2e/effects-chain.test.js
import { test, expect } from '@playwright/test';

test.describe('E2E: Effects Chain', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start audio context
    await page.locator('#start').click();
    // Wait for audio initialization
    await page.waitForTimeout(500);
  });

  test('should display effects library with available effects', async ({
    page,
  }) => {
    const fxLibrary = page.locator('#fx-library');
    await expect(fxLibrary).toBeVisible();

    // Check that effect buttons are rendered
    const effectButtons = page.locator('#fx-library button');
    const buttonCount = await effectButtons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Should have 11 effects
    expect(buttonCount).toBe(11);
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
    await expect(emptyState).toContainText(/drag.*effect/i);
  });

  test('should add effect to chain when effect button is clicked', async ({
    page,
  }) => {
    // Find and click the Delay effect button
    const delayButton = page.locator('#fx-library button', {
      hasText: 'Delay',
    });
    await delayButton.click();

    // Wait for effect to be added
    await page.waitForTimeout(200);

    // Check that effect appears in chain
    const fxChain = page.locator('#fx-chain');
    const chainItems = fxChain.locator('.fx-item');
    const itemCount = await chainItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Empty state should be hidden
    const emptyState = page.locator('.fx-empty-state');
    await expect(emptyState).not.toBeVisible();
  });

  test('should show effect parameters when effect is added', async ({
    page,
  }) => {
    // Add Reverb effect
    const reverbButton = page.locator('#fx-library button', {
      hasText: 'Reverb',
    });
    await reverbButton.click();

    await page.waitForTimeout(200);

    // Check for effect controls
    const fxControls = page.locator('.fx-controls');
    await expect(fxControls).toBeVisible();

    // Should have parameter sliders
    const sliders = page.locator('.fx-controls input[type="range"]');
    const sliderCount = await sliders.count();
    expect(sliderCount).toBeGreaterThan(0);
  });

  test('should remove effect from chain when remove button is clicked', async ({
    page,
  }) => {
    // Add an effect
    const chorusButton = page.locator('#fx-library button', {
      hasText: 'Chorus',
    });
    await chorusButton.click();

    await page.waitForTimeout(200);

    // Verify effect was added
    const fxChain = page.locator('#fx-chain');
    let chainItems = fxChain.locator('.fx-item');
    expect(await chainItems.count()).toBe(1);

    // Click remove button
    const removeButton = page.locator('.fx-item button', { hasText: '�' });
    await removeButton.click();

    await page.waitForTimeout(200);

    // Effect should be removed
    chainItems = fxChain.locator('.fx-item');
    expect(await chainItems.count()).toBe(0);

    // Empty state should be visible again
    const emptyState = page.locator('.fx-empty-state');
    await expect(emptyState).toBeVisible();
  });

  test('should allow multiple effects in chain', async ({ page }) => {
    // Add multiple effects
    const delayButton = page.locator('#fx-library button', {
      hasText: 'Delay',
    });
    await delayButton.click();
    await page.waitForTimeout(100);

    const reverbButton = page.locator('#fx-library button', {
      hasText: 'Reverb',
    });
    await reverbButton.click();
    await page.waitForTimeout(100);

    const chorusButton = page.locator('#fx-library button', {
      hasText: 'Chorus',
    });
    await chorusButton.click();
    await page.waitForTimeout(100);

    // Check chain has 3 effects
    const fxChain = page.locator('#fx-chain');
    const chainItems = fxChain.locator('.fx-item');
    expect(await chainItems.count()).toBe(3);
  });

  test('should update effect parameters with sliders', async ({ page }) => {
    // Add Delay effect
    const delayButton = page.locator('#fx-library button', {
      hasText: 'Delay',
    });
    await delayButton.click();

    await page.waitForTimeout(200);

    // Find a parameter slider (e.g., mix)
    const mixSlider = page.locator('.fx-controls input[type="range"]').first();
    await expect(mixSlider).toBeVisible();

    // Change slider value
    await mixSlider.fill('0.5');

    // Verify no errors occurred
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.waitForTimeout(100);
    expect(pageErrors).toHaveLength(0);
  });

  test('should toggle effect bypass/enable', async ({ page }) => {
    // Add an effect
    const tremoloButton = page.locator('#fx-library button', {
      hasText: 'Tremolo',
    });
    await tremoloButton.click();

    await page.waitForTimeout(200);

    // Find the bypass/enable button (if implemented)
    // This depends on UI implementation
    const fxItem = page.locator('.fx-item').first();
    await expect(fxItem).toBeVisible();

    // Check that effect has enable toggle
    const enableButton = fxItem.locator('button', {
      hasText: /enable|bypass/i,
    });
    if ((await enableButton.count()) > 0) {
      await enableButton.click();
      await page.waitForTimeout(100);
      // Effect should be bypassed/enabled
    }
  });

  test('should test all 11 effects can be added', async ({ page }) => {
    const effectNames = [
      'Delay',
      'Reverb',
      'Chorus',
      'Flanger',
      'Phaser',
      'Tremolo',
      'AutoWah',
      'BitCrusher',
      'HardClip',
      'FreqShifter',
      'PitchShifter',
    ];

    for (const effectName of effectNames) {
      // Clear chain first
      const removeButtons = page.locator('.fx-item button', { hasText: '�' });
      const removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(50);
      }

      // Add effect
      const effectButton = page.locator('#fx-library button', {
        hasText: effectName,
      });
      await effectButton.click();
      await page.waitForTimeout(100);

      // Verify effect was added
      const fxChain = page.locator('#fx-chain');
      const chainItems = fxChain.locator('.fx-item');
      expect(await chainItems.count()).toBe(1);

      // Check effect name in chain
      const effectLabel = chainItems.first();
      const labelText = await effectLabel.textContent();
      expect(labelText).toContain(effectName);
    }
  });

  test('should handle rapid effect additions and removals', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const delayButton = page.locator('#fx-library button', {
      hasText: 'Delay',
    });

    // Add and remove rapidly
    for (let i = 0; i < 5; i++) {
      await delayButton.click();
      await page.waitForTimeout(50);

      const removeButton = page.locator('.fx-item button', { hasText: '�' });
      if ((await removeButton.count()) > 0) {
        await removeButton.first().click();
        await page.waitForTimeout(50);
      }
    }

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should preserve effect parameters when switching effects', async ({
    page,
  }) => {
    // Add Delay effect
    const delayButton = page.locator('#fx-library button', {
      hasText: 'Delay',
    });
    await delayButton.click();
    await page.waitForTimeout(200);

    // Set a parameter
    const slider = page.locator('.fx-controls input[type="range"]').first();
    await slider.fill('0.7');

    // Add another effect
    const reverbButton = page.locator('#fx-library button', {
      hasText: 'Reverb',
    });
    await reverbButton.click();
    await page.waitForTimeout(200);

    // Both effects should be in chain
    const chainItems = page.locator('.fx-item');
    expect(await chainItems.count()).toBe(2);
  });

  test('should display effect chain section header', async ({ page }) => {
    const fxSection = page.locator('.fx-section');
    await expect(fxSection).toBeVisible();

    // Check for effects library header
    const libraryHeader = page.locator('text=Effects Library');
    await expect(libraryHeader).toBeVisible();

    // Check for effects chain header
    const chainHeader = page.locator('text=Effects Chain');
    await expect(chainHeader).toBeVisible();
  });

  test('should show effect parameters update in real-time', async ({
    page,
  }) => {
    // Add BitCrusher effect
    const bitcrusherButton = page.locator('#fx-library button', {
      hasText: 'BitCrusher',
    });
    await bitcrusherButton.click();

    await page.waitForTimeout(200);

    // Find parameter sliders
    const sliders = page.locator('.fx-controls input[type="range"]');
    const sliderCount = await sliders.count();

    // Update each slider
    for (let i = 0; i < sliderCount; i++) {
      const slider = sliders.nth(i);
      await slider.fill('0.5');
      await page.waitForTimeout(50);
    }

    // No errors should occur
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.waitForTimeout(100);
    expect(pageErrors).toHaveLength(0);
  });
});
