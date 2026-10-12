import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: process.env.SPECANTO_TEST_URL ?? 'http://127.0.0.1:5188', trace: 'retain-on-failure' },
  webServer: process.env.SPECANTO_TEST_URL ? undefined : { command: 'bun run dev', url: 'http://127.0.0.1:5188', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
