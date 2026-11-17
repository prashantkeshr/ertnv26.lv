import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build served statically — the same artifact GitHub Pages serves.
// CI installs Playwright's Chromium; locally set EPORT_E2E_CHANNEL=msedge (or chrome) to use an installed browser.
const channel = process.env.EPORT_E2E_CHANNEL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Several full browsers in parallel can starve each other of CPU and cause spurious timeouts.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5401', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite preview --port 5401 --strictPort',
    url: 'http://localhost:5401',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...(channel ? { channel } : {}) } },
  ],
});
