import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./test/full-stack",
  globalSetup: "./test/full-stack/setup.cjs",
  outputDir: "./test-results/full-stack",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  use: {
    baseURL: "http://localhost:3102",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
