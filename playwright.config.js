import { defineConfig, devices } from '@playwright/test';

export const BUILDER_BASE_PATH = '/hp-colors-preset-builder/';
export const BUILDER_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:4321${BUILDER_BASE_PATH}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: BUILDER_BASE_URL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4321',
    url: BUILDER_BASE_URL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1' || !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
