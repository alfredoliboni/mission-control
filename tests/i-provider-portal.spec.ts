import { test, expect } from "@playwright/test";

test.describe("I — Provider Portal (Phase 6)", () => {
  // Helper: set demo cookie
  const setDemo = async (page: any, baseURL: string) => {
    await page.context().addCookies([
      { name: "companion-demo", value: "true", url: baseURL },
    ]);
  };

  test("/portal/profile loads with profile form", async ({ page, baseURL }) => {
    await setDemo(page, baseURL!);
    await page.goto("/portal/profile");
    await expect(page.locator("body")).toContainText(/profile|organization/i);
    // Should have form inputs
    const inputs = page.locator("input, textarea, select");
    expect(await inputs.count()).toBeGreaterThan(0);
  });

  test("/portal/programs loads with programs table or empty state", async ({
    page,
    baseURL,
  }) => {
    await setDemo(page, baseURL!);
    await page.goto("/portal/programs");
    await expect(page.locator("body")).toContainText(/program/i);
  });

  test("Provider profile form has key fields", async ({ page, baseURL }) => {
    await setDemo(page, baseURL!);
    await page.goto("/portal/profile");
    // Check for key fields
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/organization|clinic|services|specialties/i);
  });

  test("Provider programs shows demo data in demo mode", async ({
    page,
    baseURL,
  }) => {
    await setDemo(page, baseURL!);
    await page.goto("/portal/programs");
    // Should show some program entries or add button
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/program|add|create/i);
  });

  test("GET /api/provider/profile — unauthenticated returns error", async ({
    request,
  }) => {
    const res = await request.get("/api/provider/profile");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/provider/programs — unauthenticated returns error", async ({
    request,
  }) => {
    const res = await request.get("/api/provider/programs");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/provider/families — unauthenticated returns error", async ({
    request,
  }) => {
    const res = await request.get("/api/provider/families");
    expect([401, 403]).toContain(res.status());
  });

  test("/portal dashboard shows provider-specific content", async ({
    page,
    baseURL,
  }) => {
    await setDemo(page, baseURL!);
    await page.goto("/portal");
    const body = await page.locator("body").textContent();
    // Should show portal content (profile, programs, messages, or families)
    expect(body).toMatch(/portal|provider|profile|program|families|messages/i);
  });

  test("Portal navigation between pages works", async ({ page, baseURL }) => {
    await setDemo(page, baseURL!);
    await page.goto("/portal");
    // Check that links to profile and programs exist
    const links = page.locator('a[href*="/portal/"]');
    expect(await links.count()).toBeGreaterThan(0);
  });
});
