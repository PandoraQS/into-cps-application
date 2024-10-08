import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  // Limit the number of workers on CI, use default locally
  workers: 1,
  retries: 0,
  timeout: 15000,
  reporter: [['list']],
  preserveOutput: 'never'
};

export default config;