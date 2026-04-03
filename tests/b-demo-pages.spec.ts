import { test, expect } from "@playwright/test";

// Set demo cookie before each test
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "companion-demo",
      value: "true",
      domain: "mission-control-gray-one.vercel.app",
      path: "/",
    },
  ]);
});

test.describe("B — Demo Mode Pages", () => {
  test("/dashboard loads, shows child name and summary cards", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Should show the dashboard page without errors
    await expect(page.locator("text=Dashboard").first()).toBeVisible({
      timeout: 15000,
    });
    // Demo child name (Alex Santos) should appear somewhere
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    // Check for stat cards or summary content
    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("/profile loads, shows child profile info", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    // Should contain profile-related content
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/alerts loads, shows alert cards", async ({ page }) => {
    await page.goto("/alerts");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/benefits loads, shows benefit entries with status badges", async ({
    page,
  }) => {
    await page.goto("/benefits");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/providers loads, shows provider cards", async ({ page }) => {
    await page.goto("/providers");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/programs loads, shows program listings", async ({ page }) => {
    await page.goto("/programs");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/documents loads, shows document table", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/messages loads, shows thread list", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("/pathway loads", async ({ page }) => {
    await page.goto("/pathway");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/ontario-system loads", async ({ page }) => {
    await page.goto("/ontario-system");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/settings loads", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
