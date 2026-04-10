const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /mobile-banner-delete\.spec\.js/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-mobile-check' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    video: 'off',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'android',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
    },
    {
      name: 'ios',
      use: {
        ...devices['iPhone 12'],
        browserName: 'webkit',
      },
    },
  ],
});
