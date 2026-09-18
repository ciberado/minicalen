import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start --workspace=@minicalen/server',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '..',
      env: {
        NODE_ENV: 'test',
        PORT: '3001',
        COLLAB_PORT: '3002',
        DATABASE_URL: '/tmp/minicalen-e2e.db',
        BETTER_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret',
      },
    },
    {
      command: 'npm run dev --workspace=@minicalen/frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '..',
    },
  ],
});
