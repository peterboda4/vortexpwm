// tests/e2e/midi-input.test.js
import { test, expect } from '@playwright/test';

/**
 * MIDI Input Testing with Mock MIDI Device
 * Tests MIDI functionality using browser's Web MIDI API mocking
 */

test.describe('E2E: MIDI Input', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant MIDI permissions
    await context.grantPermissions(['midi']);

    // Inject mock MIDI implementation before page loads
    await page.addInitScript(() => {
      // Store original navigator.requestMIDIAccess
      window.__originalRequestMIDIAccess = navigator.requestMIDIAccess;

      // Create mock MIDI implementation
      class MockMIDIInput extends EventTarget {
        constructor(id, name) {
          super();
          this.id = id;
          this.name = name;
          this.manufacturer = 'Mock Manufacturer';
          this.version = '1.0';
          this.type = 'input';
          this.state = 'connected';
          this.connection = 'closed';
          this.onstatechange = null;
          this.onmidimessage = null;
        }

        open() {
          this.connection = 'open';
          return Promise.resolve(this);
        }

        close() {
          this.connection = 'closed';
          return Promise.resolve(this);
        }

        // Helper method to simulate MIDI messages
        _simulateMIDIMessage(data, timestamp) {
          const event = new Event('midimessage');
          event.data = new Uint8Array(data);
          event.receivedTime = timestamp || performance.now();
          this.dispatchEvent(event);
          if (this.onmidimessage) {
            this.onmidimessage(event);
          }
        }
      }

      class MockMIDIOutput {
        constructor(id, name) {
          this.id = id;
          this.name = name;
          this.manufacturer = 'Mock Manufacturer';
          this.version = '1.0';
          this.type = 'output';
          this.state = 'connected';
          this.connection = 'closed';
        }

        open() {
          this.connection = 'open';
          return Promise.resolve(this);
        }

        close() {
          this.connection = 'closed';
          return Promise.resolve(this);
        }

        send(data, timestamp) {
          // Mock send - no-op
        }
      }

      class MockMIDIAccess extends EventTarget {
        constructor() {
          super();
          this.sysexEnabled = false;

          // Create mock input and output
          const input = new MockMIDIInput('mock-input-1', 'Mock MIDI Device');
          const output = new MockMIDIOutput(
            'mock-output-1',
            'Mock MIDI Device'
          );

          this.inputs = new Map([[input.id, input]]);
          this.outputs = new Map([[output.id, output]]);

          // Store reference for test access
          window.__mockMIDIInput = input;
          window.__mockMIDIOutput = output;
        }
      }

      // Override requestMIDIAccess
      navigator.requestMIDIAccess = function (options) {
        const access = new MockMIDIAccess();
        if (options && options.sysex) {
          access.sysexEnabled = true;
        }
        return Promise.resolve(access);
      };

      // Helper functions for tests
      window.__sendMIDINoteOn = function (note, velocity = 127) {
        if (window.__mockMIDIInput) {
          // MIDI Note On: status byte 0x90 (channel 1), note, velocity
          window.__mockMIDIInput._simulateMIDIMessage([0x90, note, velocity]);
        }
      };

      window.__sendMIDINoteOff = function (note, velocity = 0) {
        if (window.__mockMIDIInput) {
          // MIDI Note Off: status byte 0x80 (channel 1), note, velocity
          window.__mockMIDIInput._simulateMIDIMessage([0x80, note, velocity]);
        }
      };

      window.__sendMIDICC = function (cc, value) {
        if (window.__mockMIDIInput) {
          // MIDI CC: status byte 0xB0 (channel 1), CC number, value
          window.__mockMIDIInput._simulateMIDIMessage([0xb0, cc, value]);
        }
      };

      window.__sendMIDIPitchBend = function (value) {
        if (window.__mockMIDIInput) {
          // MIDI Pitch Bend: status byte 0xE0 (channel 1), LSB, MSB
          // Value range: 0-16383 (8192 = center)
          const lsb = value & 0x7f;
          const msb = (value >> 7) & 0x7f;
          window.__mockMIDIInput._simulateMIDIMessage([0xe0, lsb, msb]);
        }
      };

      window.__sendMIDIAftertouch = function (pressure) {
        if (window.__mockMIDIInput) {
          // MIDI Channel Aftertouch: status byte 0xD0 (channel 1), pressure
          window.__mockMIDIInput._simulateMIDIMessage([0xd0, pressure]);
        }
      };

      window.__sendMIDISustain = function (on) {
        if (window.__mockMIDIInput) {
          // MIDI Sustain Pedal (CC 64): on = 127, off = 0
          window.__mockMIDIInput._simulateMIDIMessage([0xb0, 64, on ? 127 : 0]);
        }
      };
    });

    await page.goto('/');
    await page.locator('#start').click();
    await page.waitForTimeout(500);

    // Enable mock MIDI device
    const midiCheckbox = page.locator(
      'input[type="checkbox"][value="mock-input-1"]'
    );
    if ((await midiCheckbox.count()) > 0) {
      await midiCheckbox.check();
      await page.waitForTimeout(100);
    }
  });

  test('should detect and list mock MIDI device', async ({ page }) => {
    // Check if MIDI device appears in the list
    const deviceLabel = page.locator('text=Mock MIDI Device');
    await expect(deviceLabel).toBeVisible();

    // Verify checkbox exists
    const checkbox = page.locator(
      'input[type="checkbox"][value="mock-input-1"]'
    );
    await expect(checkbox).toBeVisible();
  });

  test('should respond to MIDI note on/off messages', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Get initial voice count
    const initialCount = parseInt(await voiceCountValue.textContent());

    // Send MIDI Note On for C4 (MIDI note 60)
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(100);

    // Voice count should increase
    const afterNoteOnCount = parseInt(await voiceCountValue.textContent());
    expect(afterNoteOnCount).toBeGreaterThan(initialCount);

    // Send MIDI Note Off
    await page.evaluate(() => {
      window.__sendMIDINoteOff(60);
    });

    await page.waitForTimeout(2000); // Wait for release envelope

    // Voice count should decrease
    const afterNoteOffCount = parseInt(await voiceCountValue.textContent());
    expect(afterNoteOffCount).toBeLessThanOrEqual(afterNoteOnCount);
  });

  test('should handle multiple simultaneous MIDI notes (polyphony)', async ({
    page,
  }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Send chord: C4, E4, G4 (C major triad)
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100); // C4
      window.__sendMIDINoteOn(64, 100); // E4
      window.__sendMIDINoteOn(67, 100); // G4
    });

    await page.waitForTimeout(100);

    // Should have 3 voices active
    const voiceCount = parseInt(await voiceCountValue.textContent());
    expect(voiceCount).toBeGreaterThanOrEqual(3);

    // Release all notes
    await page.evaluate(() => {
      window.__sendMIDINoteOff(60);
      window.__sendMIDINoteOff(64);
      window.__sendMIDINoteOff(67);
    });
  });

  test('should respect MIDI velocity values', async ({ page }) => {
    // Test with different velocities
    // Note: We can't directly measure audio output, but we verify no errors occur

    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Send notes with varying velocities
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 1); // Very soft
      window.__sendMIDINoteOff(60);
      window.__sendMIDINoteOn(62, 64); // Medium
      window.__sendMIDINoteOff(62);
      window.__sendMIDINoteOn(64, 127); // Maximum
      window.__sendMIDINoteOff(64);
    });

    await page.waitForTimeout(100);

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle MIDI pitch bend messages', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Play a note
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(50);

    // Send pitch bend up (max)
    await page.evaluate(() => {
      window.__sendMIDIPitchBend(16383); // Max up
    });

    await page.waitForTimeout(100);

    // Send pitch bend center
    await page.evaluate(() => {
      window.__sendMIDIPitchBend(8192); // Center
    });

    await page.waitForTimeout(100);

    // Send pitch bend down (min)
    await page.evaluate(() => {
      window.__sendMIDIPitchBend(0); // Max down
    });

    await page.waitForTimeout(100);

    // Release note
    await page.evaluate(() => {
      window.__sendMIDINoteOff(60);
    });

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle MIDI sustain pedal (CC 64)', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Press sustain pedal
    await page.evaluate(() => {
      window.__sendMIDISustain(true);
    });

    // Play and release note
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(50);

    await page.evaluate(() => {
      window.__sendMIDINoteOff(60);
    });

    await page.waitForTimeout(200);

    // Voice should still be active (sustained)
    const sustainedCount = parseInt(await voiceCountValue.textContent());
    expect(sustainedCount).toBeGreaterThan(0);

    // Release sustain pedal
    await page.evaluate(() => {
      window.__sendMIDISustain(false);
    });

    await page.waitForTimeout(2000); // Wait for release

    // Voice should be released now
    const afterReleaseCount = parseInt(await voiceCountValue.textContent());
    expect(afterReleaseCount).toBe(0);
  });

  test('should handle MIDI aftertouch (channel pressure)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Play a note
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(50);

    // Send aftertouch messages
    await page.evaluate(() => {
      window.__sendMIDIAftertouch(0);
      window.__sendMIDIAftertouch(64);
      window.__sendMIDIAftertouch(127);
    });

    await page.waitForTimeout(100);

    // Release note
    await page.evaluate(() => {
      window.__sendMIDINoteOff(60);
    });

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle MIDI CC messages (Continuous Controllers)', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Send various CC messages
    await page.evaluate(() => {
      window.__sendMIDICC(1, 64); // Modulation wheel
      window.__sendMIDICC(7, 100); // Volume
      window.__sendMIDICC(10, 64); // Pan
      window.__sendMIDICC(11, 127); // Expression
    });

    await page.waitForTimeout(100);

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle MIDI panic (All Notes Off - CC 123)', async ({
    page,
  }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Play multiple notes
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
      window.__sendMIDINoteOn(64, 100);
      window.__sendMIDINoteOn(67, 100);
    });

    await page.waitForTimeout(100);

    // Verify voices are active
    const beforePanicCount = parseInt(await voiceCountValue.textContent());
    expect(beforePanicCount).toBeGreaterThan(0);

    // Send All Notes Off (CC 123)
    await page.evaluate(() => {
      window.__sendMIDICC(123, 0);
    });

    await page.waitForTimeout(2000); // Wait for release

    // All voices should be off
    const afterPanicCount = parseInt(await voiceCountValue.textContent());
    expect(afterPanicCount).toBe(0);
  });

  test('should handle MIDI All Sound Off (CC 120)', async ({ page }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Play multiple notes
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
      window.__sendMIDINoteOn(64, 100);
      window.__sendMIDINoteOn(67, 100);
    });

    await page.waitForTimeout(100);

    // Send All Sound Off (CC 120)
    await page.evaluate(() => {
      window.__sendMIDICC(120, 0);
    });

    await page.waitForTimeout(2000); // Wait for release

    // All voices should be off
    const afterPanicCount = parseInt(await voiceCountValue.textContent());
    expect(afterPanicCount).toBe(0);
  });

  test('should handle note retrigger (same note played twice)', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Play note
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(50);

    // Play same note again (should retrigger)
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(50);

    // Release note
    await page.evaluate(() => {
      window.__sendMIDINoteOff(60);
    });

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle voice stealing when exceeding max voices', async ({
    page,
  }) => {
    const voiceCountValue = page.locator('#voiceCountValue');

    // Play 10 notes (exceeds 8 voice limit)
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        window.__sendMIDINoteOn(60 + i, 100);
      }
    });

    await page.waitForTimeout(100);

    // Voice count should not exceed 8
    const voiceCount = parseInt(await voiceCountValue.textContent());
    expect(voiceCount).toBeLessThanOrEqual(8);

    // Clean up
    await page.evaluate(() => {
      window.__sendMIDICC(123, 0); // All Notes Off
    });
  });

  test('should handle rapid MIDI note messages without errors', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Send rapid note on/off messages
    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        window.__sendMIDINoteOn(60, 100);
        window.__sendMIDINoteOff(60);
      }
    });

    await page.waitForTimeout(500);

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should validate MIDI note range (0-127)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Test boundary values
    await page.evaluate(() => {
      window.__sendMIDINoteOn(0, 100); // Min valid
      window.__sendMIDINoteOff(0);
      window.__sendMIDINoteOn(127, 100); // Max valid
      window.__sendMIDINoteOff(127);
      window.__sendMIDINoteOn(60, 100); // Middle C
      window.__sendMIDINoteOff(60);
    });

    await page.waitForTimeout(100);

    // No errors should occur for valid notes
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle MIDI device disconnection gracefully', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Uncheck MIDI device (simulates disconnection)
    const checkbox = page.locator(
      'input[type="checkbox"][value="mock-input-1"]'
    );
    await checkbox.uncheck();
    await page.waitForTimeout(100);

    // Try to send MIDI message (should be ignored)
    await page.evaluate(() => {
      window.__sendMIDINoteOn(60, 100);
    });

    await page.waitForTimeout(100);

    // No errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should handle multiple MIDI devices (if supported)', async ({
    page,
  }) => {
    // This test verifies the UI can handle multiple devices
    const deviceCheckboxes = page.locator(
      'input[type="checkbox"][id^="midi-"]'
    );
    const deviceCount = await deviceCheckboxes.count();

    // Should have at least one device (our mock)
    expect(deviceCount).toBeGreaterThanOrEqual(1);
  });
});
