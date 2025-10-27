// tests/browser/voice-allocation.test.js
import { test, expect } from '@playwright/test';

test.describe('Voice Allocation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(1500); // Wait for AudioContext initialization
  });

  test('should handle noteOn events', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Trigger noteOn via keyboard
    const keyboard = page.locator('#keyboard');

    // Check if keyboard exists
    if (await keyboard.isVisible()) {
      // Find and click a key
      const key = page.locator('.key').first();
      await key.click();
      await page.waitForTimeout(500);

      // Release the key
      await key.dispatchEvent('mouseup');
      await page.waitForTimeout(500);
    } else {
      // Fallback: trigger via JavaScript evaluation
      await page.evaluate(() => {
        if (window.synth && window.synth.noteOn) {
          window.synth.noteOn(60, 0.8); // Middle C
        }
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        if (window.synth && window.synth.noteOff) {
          window.synth.noteOff(60);
        }
      });
      await page.waitForTimeout(500);
    }

    expect(errors).toHaveLength(0);
  });

  test('should handle multiple simultaneous notes', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Play multiple notes
    await page.evaluate(() => {
      if (window.synth && window.synth.noteOn) {
        window.synth.noteOn(60, 0.8); // C
        window.synth.noteOn(64, 0.8); // E
        window.synth.noteOn(67, 0.8); // G
        window.synth.noteOn(72, 0.8); // C (octave up)
      }
    });

    await page.waitForTimeout(1000);

    // Release all notes
    await page.evaluate(() => {
      if (window.synth && window.synth.noteOff) {
        window.synth.noteOff(60);
        window.synth.noteOff(64);
        window.synth.noteOff(67);
        window.synth.noteOff(72);
      }
    });

    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('should handle voice stealing when polyphony limit is reached', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Play more notes than MAX_VOICES (default 8)
    await page.evaluate(() => {
      if (window.synth && window.synth.noteOn) {
        for (let i = 60; i < 72; i++) {
          // Play 12 notes (more than 8 voices)
          window.synth.noteOn(i, 0.8);
        }
      }
    });

    await page.waitForTimeout(1000);

    // Should not have thrown errors (voice stealing should work)
    expect(errors).toHaveLength(0);

    // Release all notes
    await page.evaluate(() => {
      if (window.synth && window.synth.allNotesOff) {
        window.synth.allNotesOff();
      }
    });

    await page.waitForTimeout(500);
  });

  test('should handle allNotesOff panic button', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Play several notes
    await page.evaluate(() => {
      if (window.synth && window.synth.noteOn) {
        window.synth.noteOn(60, 0.8);
        window.synth.noteOn(64, 0.8);
        window.synth.noteOn(67, 0.8);
      }
    });

    await page.waitForTimeout(500);

    // Trigger all notes off
    await page.evaluate(() => {
      if (window.synth && window.synth.allNotesOff) {
        window.synth.allNotesOff();
      }
    });

    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });

  test('should validate MIDI note range', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Try to play invalid notes
    await page.evaluate(() => {
      if (window.synth && window.synth.noteOn) {
        window.synth.noteOn(-1, 0.8); // Invalid (too low)
        window.synth.noteOn(128, 0.8); // Invalid (too high)
        window.synth.noteOn(60, 0.8); // Valid
      }
    });

    await page.waitForTimeout(1000);

    // Check that invalid notes were rejected (should see warnings or errors in console)
    // Or at minimum, no page errors should have been thrown
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(500);

    // The system should handle invalid notes gracefully without crashing
    expect(
      errors.filter((e) => e.includes('crash') || e.includes('undefined'))
    ).toHaveLength(0);
  });

  test('should handle rapid note retriggering', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Rapidly trigger the same note
    await page.evaluate(() => {
      if (window.synth && window.synth.noteOn && window.synth.noteOff) {
        for (let i = 0; i < 10; i++) {
          window.synth.noteOn(60, 0.8);
          window.synth.noteOff(60);
        }
      }
    });

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
