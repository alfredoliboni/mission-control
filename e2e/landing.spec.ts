import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toContainText("alone");
    await expect(page.getByRole("link", { name: /See It In Action/i })).toBeVisible();
  });

  test("has stats bar", async ({ page }) => {
    await page.goto("/");
    // Stats are below the fold — check the page HTML contains them
    await expect(page.locator("body")).toContainText("24/7", { timeout: 10_000 });
  });

  test("has FAQ section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Everything you need to know")).toBeVisible({ timeout: 10_000 });
  });

  test("has privacy section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("data is sacred")).toBeVisible({ timeout: 10_000 });
  });

  test("has footer with navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("For Families", { timeout: 10_000 });
    await expect(page.locator("body")).toContainText("For Providers", { timeout: 10_000 });
  });

  test("demo link navigates to demo page", async ({ page }) => {
    await page.goto("/");
    const demoLink = page.getByRole("link", { name: /See It In Action/i });
    await demoLink.click();
    await page.waitForURL(/\/demo/, { timeout: 10_000 });
  });
});
