const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*basic-flow*',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run server',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
    },
    {
      command: 'cd client && npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
    },
  ],
});
