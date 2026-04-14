import { test, expect } from "@playwright/test";

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
});
