// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for browser-based testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node tests/test-server.js',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
