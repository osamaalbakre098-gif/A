import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// In der Cloud-Umgebung liegt ein vorinstalliertes Chromium; lokal nimmt Playwright sein eigenes.
const localChromium = '/opt/pw-browsers/chromium';
const launchOptions = existsSync(localChromium) ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 14'] } },
  ],
});
