# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: i-provider-portal.spec.ts >> I — Provider Portal (Phase 6) >> GET /api/provider/profile — unauthenticated returns error
- Location: tests/i-provider-portal.spec.ts:48:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 404
Received array: [401, 403]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("I — Provider Portal (Phase 6)", () => {
  4  |   // Helper: set demo cookie
  5  |   const setDemo = async (page: any, baseURL: string) => {
  6  |     await page.context().addCookies([
  7  |       { name: "companion-demo", value: "true", url: baseURL },
  8  |     ]);
  9  |   };
  10 | 
  11 |   test("/portal/profile loads with profile form", async ({ page, baseURL }) => {
  12 |     await setDemo(page, baseURL!);
  13 |     await page.goto("/portal/profile");
  14 |     await expect(page.locator("body")).toContainText(/profile|organization/i);
  15 |     // Should have form inputs
  16 |     const inputs = page.locator("input, textarea, select");
  17 |     expect(await inputs.count()).toBeGreaterThan(0);
  18 |   });
  19 | 
  20 |   test("/portal/programs loads with programs table or empty state", async ({
  21 |     page,
  22 |     baseURL,
  23 |   }) => {
  24 |     await setDemo(page, baseURL!);
  25 |     await page.goto("/portal/programs");
  26 |     await expect(page.locator("body")).toContainText(/program/i);
  27 |   });
  28 | 
  29 |   test("Provider profile form has key fields", async ({ page, baseURL }) => {
  30 |     await setDemo(page, baseURL!);
  31 |     await page.goto("/portal/profile");
  32 |     // Check for key fields
  33 |     const body = await page.locator("body").textContent();
  34 |     expect(body).toMatch(/organization|clinic|services|specialties/i);
  35 |   });
  36 | 
  37 |   test("Provider programs shows demo data in demo mode", async ({
  38 |     page,
  39 |     baseURL,
  40 |   }) => {
  41 |     await setDemo(page, baseURL!);
  42 |     await page.goto("/portal/programs");
  43 |     // Should show some program entries or add button
  44 |     const body = await page.locator("body").textContent();
  45 |     expect(body).toMatch(/program|add|create/i);
  46 |   });
  47 | 
  48 |   test("GET /api/provider/profile — unauthenticated returns error", async ({
  49 |     request,
  50 |   }) => {
  51 |     const res = await request.get("/api/provider/profile");
> 52 |     expect([401, 403]).toContain(res.status());
     |                        ^ Error: expect(received).toContain(expected) // indexOf
  53 |   });
  54 | 
  55 |   test("GET /api/provider/programs — unauthenticated returns error", async ({
  56 |     request,
  57 |   }) => {
  58 |     const res = await request.get("/api/provider/programs");
  59 |     expect([401, 403]).toContain(res.status());
  60 |   });
  61 | 
  62 |   test("GET /api/provider/families — unauthenticated returns error", async ({
  63 |     request,
  64 |   }) => {
  65 |     const res = await request.get("/api/provider/families");
  66 |     expect([401, 403]).toContain(res.status());
  67 |   });
  68 | 
  69 |   test("/portal dashboard shows provider-specific content", async ({
  70 |     page,
  71 |     baseURL,
  72 |   }) => {
  73 |     await setDemo(page, baseURL!);
  74 |     await page.goto("/portal");
  75 |     const body = await page.locator("body").textContent();
  76 |     // Should show portal content (profile, programs, messages, or families)
  77 |     expect(body).toMatch(/portal|provider|profile|program|families|messages/i);
  78 |   });
  79 | 
  80 |   test("Portal navigation between pages works", async ({ page, baseURL }) => {
  81 |     await setDemo(page, baseURL!);
  82 |     await page.goto("/portal");
  83 |     // Check that links to profile and programs exist
  84 |     const links = page.locator('a[href*="/portal/"]');
  85 |     expect(await links.count()).toBeGreaterThan(0);
  86 |   });
  87 | });
  88 | 
```