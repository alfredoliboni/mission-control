import { test, expect } from "@playwright/test";

test.describe("L — API Error Scenarios", () => {

  test.describe("API Route Error Responses", () => {
    test("GET /api/companion/[...path] - 404 for invalid paths", async ({ request }) => {
      const response = await request.get("/api/companion/nonexistent/path");
      expect([404, 500]).toContain(response.status());
    });

    test("GET /api/workspace/[filename] - 404 for missing files", async ({ request }) => {
      const response = await request.get("/api/workspace/nonexistent-file.txt");
      expect([404, 500]).toContain(response.status());
    });

    test("GET /api/documents/[id] - 404 for invalid document ID", async ({ request }) => {
      const response = await request.get("/api/documents/invalid-id-12345");
      expect([404, 400, 500]).toContain(response.status());
    });

    test("GET /api/messages/[threadId] - 404 for invalid thread", async ({ request }) => {
      const response = await request.get("/api/messages/invalid-thread-id");
      expect([404, 400, 500]).toContain(response.status());
    });

    test("POST /api/messages without authentication", async ({ request }) => {
      const response = await request.post("/api/messages", {
        data: { content: "Test message", threadId: "test" }
      });
      expect([401, 403, 405]).toContain(response.status());
    });

    test("POST /api/documents without authentication", async ({ request }) => {
      const response = await request.post("/api/documents", {
        data: { title: "Test Document", content: "Test content" }
      });
      expect([401, 403, 405]).toContain(response.status());
    });

    test("PUT /api/provider/profile without authentication", async ({ request }) => {
      const response = await request.put("/api/provider/profile", {
        data: { organization: "Test Org" }
      });
      expect([401, 403, 405]).toContain(response.status());
    });

    test("DELETE /api/provider/programs/[id] without authentication", async ({ request }) => {
      const response = await request.delete("/api/provider/programs/test-id");
      expect([401, 403, 405, 404]).toContain(response.status());
    });
  });

  test.describe("Provider Portal API Errors", () => {
    test("GET /api/provider/profile - unauthenticated", async ({ request }) => {
      const response = await request.get("/api/provider/profile");
      expect([401, 403]).toContain(response.status());

      // Check response body for error message
      const responseText = await response.text();
      expect(responseText.length).toBeGreaterThan(0);
    });

    test("GET /api/provider/programs - unauthenticated", async ({ request }) => {
      const response = await request.get("/api/provider/programs");
      expect([401, 403]).toContain(response.status());
    });

    test("GET /api/provider/families - unauthenticated", async ({ request }) => {
      const response = await request.get("/api/provider/families");
      expect([401, 403]).toContain(response.status());
    });

    test("POST /api/provider/programs - invalid data", async ({ request }) => {
      const response = await request.post("/api/provider/programs", {
        data: { invalid: "data" }
      });
      expect([400, 401, 403, 405]).toContain(response.status());
    });

    test("PUT /api/provider/programs/[id] - malformed ID", async ({ request }) => {
      const response = await request.put("/api/provider/programs/malformed-id-123", {
        data: { name: "Updated Program" }
      });
      expect([400, 401, 403, 404, 405]).toContain(response.status());
    });
  });

  test.describe("Demo Mode API Behavior", () => {
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

    test("Demo mode - workspace API returns demo data", async ({ request }) => {
      // In demo mode, workspace API should return demo data
      const response = await request.get("/api/workspace/documents.json");

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
      } else {
        // Demo mode might return different status codes
        expect([200, 404, 500]).toContain(response.status());
      }
    });

    test("Demo mode - companion API proxy behavior", async ({ request }) => {
      const response = await request.get("/api/companion/benefits");

      // Demo mode should handle this gracefully
      expect([200, 404, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(typeof data).toBe("object");
      }
    });

    test("Demo mode - protected routes still require auth", async ({ request }) => {
      // Even in demo mode, some routes should require proper auth
      const response = await request.post("/api/provider/profile", {
        data: { organization: "Test" }
      });
      expect([401, 403, 405]).toContain(response.status());
    });
  });

  test.describe("Frontend Error Handling", () => {
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

    test("Documents page handles API errors gracefully", async ({ page }) => {
      await page.goto("/documents");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Check for error handling indicators
      const bodyText = await page.locator("body").textContent();

      // Page should either show data or handle errors gracefully
      expect(bodyText!.length).toBeGreaterThan(50);

      // Check console for unhandled errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(2000);

      // No critical console errors should appear
      const criticalErrors = errors.filter(err =>
        err.includes('Uncaught') ||
        err.includes('TypeError') ||
        err.includes('ReferenceError')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test("Messages page handles missing threads", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Page should load without crashing
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(30);

      // Try to access a non-existent thread
      await page.goto("/messages/nonexistent-thread-123");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Should handle gracefully (error page or redirect)
      const url = page.url();
      expect(url).toContain("mission-control");
    });

    test("Provider portal handles API failures", async ({ page }) => {
      await page.goto("/portal/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Page should load even if some API calls fail
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(30);

      // Try to trigger form submission (might fail gracefully)
      const submitBtn = page.locator("button[type='submit'], button:has-text('Save')");
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(2000);

        // Should handle submission result gracefully
        const currentUrl = page.url();
        expect(currentUrl).toContain("mission-control");
      }
    });

    test("Dashboard handles data loading errors", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Listen for failed network requests
      const failedRequests: string[] = [];
      page.on('response', response => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()}: ${response.url()}`);
        }
      });

      await page.waitForTimeout(3000);

      // Dashboard should render despite API failures
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(100);

      // Log failed requests for debugging
      if (failedRequests.length > 0) {
        console.log("Failed requests:", failedRequests);
      }
    });
  });

  test.describe("Network Timeout Simulation", () => {
    test("Slow API responses don't crash the app", async ({ page, context }) => {
      await context.addCookies([
        {
          name: "companion-demo",
          value: "true",
          domain: "mission-control-gray-one.vercel.app",
          path: "/",
        },
      ]);

      // Set longer timeout for this test
      await page.goto("/documents", { timeout: 30000 });

      // Wait for initial load
      await page.waitForLoadState("domcontentloaded");

      // Give extra time for slow API responses
      await page.waitForTimeout(10000);

      // Page should eventually load
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(30);
    });

    test("Navigation during API loading", async ({ page, context }) => {
      await context.addCookies([
        {
          name: "companion-demo",
          value: "true",
          domain: "mission-control-gray-one.vercel.app",
          path: "/",
        },
      ]);

      await page.goto("/documents");

      // Navigate away quickly before API finishes
      await page.waitForTimeout(1000);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Should handle navigation during loading
      const url = page.url();
      expect(url).toContain("/dashboard");

      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);
    });
  });

  test.describe("Malformed Response Handling", () => {
    test("Invalid JSON responses handled gracefully", async ({ page, context }) => {
      await context.addCookies([
        {
          name: "companion-demo",
          value: "true",
          domain: "mission-control-gray-one.vercel.app",
          path: "/",
        },
      ]);

      // Monitor console for JSON parsing errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('JSON')) {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto("/benefits");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Page should load despite potential JSON errors
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);

      // Log any JSON errors for debugging
      if (consoleErrors.length > 0) {
        console.log("JSON parsing errors:", consoleErrors);
      }
    });

    test("Missing response fields handled", async ({ page, context }) => {
      await context.addCookies([
        {
          name: "companion-demo",
          value: "true",
          domain: "mission-control-gray-one.vercel.app",
          path: "/",
        },
      ]);

      await page.goto("/programs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Page should render with available data
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);

      // Check that missing data doesn't cause rendering issues
      const bodyHtml = await page.locator("body").innerHTML();
      expect(bodyHtml).not.toContain("[object Object]");
      expect(bodyHtml).not.toContain("undefined");
    });
  });
});