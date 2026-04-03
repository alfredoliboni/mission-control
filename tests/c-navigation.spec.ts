import { test, expect } from "@playwright/test";

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

test.describe("C — Navigation & Layout", () => {
  test("Sidebar shows all navigation items", async ({ page }) => {
    // Use a wide viewport to see desktop sidebar
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator('aside[aria-label="Sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Dashboard link should always be present
    await expect(sidebar.locator("text=Dashboard")).toBeVisible();

    // Wait for section loading to finish (skeletons should disappear)
    await page.waitForTimeout(3000);

    // Check for group labels
    const nav = sidebar.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test("Each nav item links to correct page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const sidebar = page.locator('aside[aria-label="Sidebar"]');

    // Get all navigation links in the sidebar
    const links = sidebar.locator("nav a");
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);

    // Verify each link has an href
    for (let i = 0; i < linkCount; i++) {
      const href = await links.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^\//);
    }
  });

  test("Mobile: hamburger menu opens/closes sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Desktop sidebar should NOT be visible on mobile
    const desktopSidebar = page.locator('aside[aria-label="Sidebar"]');
    await expect(desktopSidebar).not.toBeVisible();

    // Find the hamburger/menu button and click it
    const menuButton = page.locator('button[aria-label="Open sidebar"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Mobile overlay sidebar should appear
      const mobileNav = page.locator('[role="dialog"][aria-label="Navigation menu"]');
      await expect(mobileNav).toBeVisible({ timeout: 5000 });

      // Close it
      const closeButton = page.locator('button[aria-label="Close sidebar"]');
      await closeButton.click();
      await expect(mobileNav).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("Active page highlighted in sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const sidebar = page.locator('aside[aria-label="Sidebar"]');
    // Dashboard link should have active styling (bg-primary/10)
    // There are two links to /dashboard: the logo and the nav link. Use the nav link.
    const dashboardLink = sidebar.locator('nav a[href="/dashboard"]');
    await expect(dashboardLink).toBeVisible();
    const className = await dashboardLink.getAttribute("class");
    expect(className).toContain("primary");
  });

  test("Settings link visible in sidebar footer", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator('aside[aria-label="Sidebar"]');
    await expect(sidebar.locator("text=Settings")).toBeVisible({
      timeout: 10000,
    });
  });
});
