import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 30000,
  retries: 0,
  reporter: [
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
    trace: 'retain-on-failure',
  },
});