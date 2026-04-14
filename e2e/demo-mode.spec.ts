import { test, expect } from "@playwright/test";

test.describe("Demo Mode", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "companion-demo", value: "true", domain: "localhost", path: "/" },
    ]);
  });

  test("dashboard loads with child name", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for any heading or content to appear
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
    await expect(page.locator("body")).toContainText("Alex", { timeout: 10_000 });
  });

  test("profile section loads", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
  });

  test("providers section loads", async ({ page }) => {
    await page.goto("/providers");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
    await expect(page.getByText("Service Providers")).toBeVisible({ timeout: 10_000 });
  });

  test("alerts section loads", async ({ page }) => {
    await page.goto("/alerts");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
  });

  test("benefits section loads", async ({ page }) => {
    await page.goto("/benefits");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
  });

  test("pathway section loads", async ({ page }) => {
    await page.goto("/pathway");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
  });

  test("calendar loads with navigation", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
    // Calendar heading appears in the WorkspaceSection title
    await expect(page.locator("body")).toContainText("event", { timeout: 10_000 });
  });

  test("community forum loads", async ({ page }) => {
    await page.goto("/community");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10_000 });
  });

  test("sidebar has navigation links", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);
    await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10_000 });
  });
});
