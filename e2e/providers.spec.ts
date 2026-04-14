import { test, expect } from "@playwright/test";

test.describe("Provider Search UI", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "companion-demo", value: "true", domain: "localhost", path: "/" },
    ]);
  });

  test("providers page loads with tabs", async ({ page }) => {
    await page.goto("/providers");
    await expect(page.getByText("Service Providers")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Search All")).toBeVisible();
  });

  test("search all tab shows map", async ({ page }) => {
    await page.goto("/providers");
    await page.getByText("Search All").click();
    await expect(page.getByText("Provider Map")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Provider Search API", () => {
  test("returns providers for empty query", async ({ request }) => {
    const res = await request.get("/api/providers/search");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.providers).toBeDefined();
    expect(data.providers.length).toBeGreaterThan(0);
  });

  test("fuzzy search handles typos", async ({ request }) => {
    const res = await request.get("/api/providers/search?q=ocupational");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.providers.length).toBeGreaterThan(0);
  });

  test("recommended returns providers", async ({ request }) => {
    const res = await request.get("/api/providers/recommended?needs=OT,SLP&city=London");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.providers).toBeDefined();
  });

  test("protected endpoints return 401", async ({ request }) => {
    const res = await request.get("/api/workspace-live");
    expect(res.status()).toBe(401);
  });

  test("demo chat works with cookie", async ({ request }) => {
    const res = await request.post("/api/chat", {
      headers: { Cookie: "companion-demo=true" },
      data: { message: "help" },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.response.length).toBeGreaterThan(10);
  });
});
