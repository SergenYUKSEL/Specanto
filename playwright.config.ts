import { defineConfig, devices } from '@playwright/test';

const demoUrl = process.env.SPECANTO_TEST_URL ?? (process.env.CI ? 'http://127.0.0.1:5190' : 'http://127.0.0.1:5188');
const fixturesUrl = 'http://127.0.0.1:5192';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  workers: process.env.CI ? 2 : undefined,
  use: { baseURL: demoUrl, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: [
    ...(!process.env.SPECANTO_TEST_URL ? [{
      command: process.env.CI ? 'PORT=5190 bun run start' : 'bun run dev',
      url: demoUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    }] : []),
    {
      command: 'bun --bun vite --config e2e/fixtures/vite.config.ts --host 127.0.0.1',
      url: fixturesUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
