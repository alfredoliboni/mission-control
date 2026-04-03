import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 3,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: "https://mission-control-gray-one.vercel.app",
    screenshot: "only-on-failure",
    trace: "off",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  outputDir: "test-results/",
});
