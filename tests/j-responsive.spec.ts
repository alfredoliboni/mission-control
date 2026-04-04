import { test, expect } from "@playwright/test";

test.describe("J — Responsive & Mobile Testing", () => {
  // Helper: set demo cookie
  const setDemo = async (page: any, context: any) => {
    await context.addCookies([
      {
        name: "companion-demo",
        value: "true",
        domain: "mission-control-gray-one.vercel.app",
        path: "/",
      },
    ]);
  };

  test.describe("Mobile Viewport (375px)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
    });

    test("Dashboard mobile layout - no horizontal scroll", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(395); // Allow small margin

      // Verify key elements are visible
      await expect(page.locator("h1, h2, h3").first()).toBeVisible();

      // Check that sidebar/navigation adapts to mobile
      const nav = page.locator("nav:visible, [role='navigation']:visible");
      if (await nav.count() > 0) {
        await expect(nav.first()).toBeVisible();
      }

      await page.screenshot({ path: "test-results/dashboard-mobile-full.png" });
    });

    test("Messages page mobile layout", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(395);

      // Message content should be readable
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);

      await page.screenshot({ path: "test-results/messages-mobile-full.png" });
    });

    test("Documents page mobile layout", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/documents");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(395);

      // Table should be responsive (scrollable or stacked)
      const table = page.locator("table");
      if (await table.count() > 0) {
        await expect(table.first()).toBeVisible();

        // Table container should not cause overflow
        const tableContainer = table.first().locator("xpath=..");
        await expect(tableContainer).toBeVisible();
      }

      await page.screenshot({ path: "test-results/documents-mobile-full.png" });
    });

    test("Benefits page mobile layout", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/benefits");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(395);

      // Content should be readable
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(100);
    });

    test("Provider portal mobile layout", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(395);

      // Form elements should be usable on mobile
      const inputs = page.locator("input, textarea, select");
      const inputCount = await inputs.count();
      if (inputCount > 0) {
        // First input should be visible and properly sized
        await expect(inputs.first()).toBeVisible();

        // Check input width doesn't cause overflow
        const inputWidth = await inputs.first().evaluate(el => el.getBoundingClientRect().width);
        expect(inputWidth).toBeLessThanOrEqual(355); // Allow for padding
      }
    });

    test("Mobile navigation - touch friendly", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Look for navigation links
      const navLinks = page.locator("a[href^='/']");
      const linkCount = await navLinks.count();

      if (linkCount > 0) {
        // Click on first available navigation link
        const firstLink = navLinks.first();
        await expect(firstLink).toBeVisible();

        // Check that link is touch-friendly (minimum 44px height)
        const linkHeight = await firstLink.evaluate(el => el.getBoundingClientRect().height);
        expect(linkHeight).toBeGreaterThanOrEqual(40); // Close to 44px standard

        // Test navigation works
        await firstLink.click();
        await page.waitForLoadState("networkidle");

        // Should navigate successfully
        const url = page.url();
        expect(url).toContain("mission-control");
      }
    });
  });

  test.describe("Tablet Viewport (768px)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
    });

    test("Dashboard tablet layout", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(788); // Allow small margin

      // Tablet should show more content than mobile
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(200);

      await page.screenshot({ path: "test-results/dashboard-tablet.png" });
    });

    test("Documents table tablet view", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/documents");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Table should display properly on tablet
      const table = page.locator("table");
      if (await table.count() > 0) {
        await expect(table.first()).toBeVisible();

        // Check table headers are visible
        const headers = table.locator("th");
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);

        // Table should not overflow
        const tableWidth = await table.first().evaluate(el => el.getBoundingClientRect().width);
        expect(tableWidth).toBeLessThanOrEqual(768);
      }

      await page.screenshot({ path: "test-results/documents-tablet.png" });
    });

    test("Provider portal forms tablet view", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Forms should be well-laid out on tablet
      const inputs = page.locator("input, textarea, select");
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        // Inputs should use tablet space efficiently
        const inputWidth = await inputs.first().evaluate(el => el.getBoundingClientRect().width);
        expect(inputWidth).toBeGreaterThan(200); // Should be wider than mobile
        expect(inputWidth).toBeLessThanOrEqual(748); // But not overflow
      }

      await page.screenshot({ path: "test-results/portal-tablet.png" });
    });
  });

  test.describe("Cross-Viewport Testing", () => {
    test("Responsive navigation adapts between viewports", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");

      // Test desktop first
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForLoadState("networkidle");

      const desktopNav = page.locator("nav, [role='navigation']");
      let desktopNavVisible = false;
      if (await desktopNav.count() > 0) {
        desktopNavVisible = await desktopNav.first().isVisible();
      }

      // Switch to mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(1000);

      // Navigation should still work (possibly different layout)
      if (desktopNavVisible) {
        const mobileNav = page.locator("nav, [role='navigation'], button[aria-label*='menu']");
        await expect(mobileNav.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test("Content reflows properly between viewports", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/benefits");
      await page.waitForLoadState("networkidle");

      // Start wide
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(1000);

      const wideContent = await page.locator("body").textContent();
      const wideWidth = await page.evaluate(() => document.body.scrollWidth);

      // Switch to narrow
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(1000);

      const narrowContent = await page.locator("body").textContent();
      const narrowWidth = await page.evaluate(() => document.body.scrollWidth);

      // Content should remain accessible
      expect(narrowContent!.length).toBeGreaterThan(wideContent!.length * 0.8);
      expect(narrowWidth).toBeLessThanOrEqual(395);
    });

    test("Images and media are responsive", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Check for images
      const images = page.locator("img");
      const imageCount = await images.count();

      if (imageCount > 0) {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(500);

        // Images should not cause overflow
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const img = images.nth(i);
          if (await img.isVisible()) {
            const imgWidth = await img.evaluate(el => el.getBoundingClientRect().width);
            expect(imgWidth).toBeLessThanOrEqual(375);
          }
        }
      }
    });
  });
});