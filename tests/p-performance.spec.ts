import { test, expect } from "@playwright/test";

test.describe("P — Performance Testing", () => {
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

  test.describe("Page Load Performance", () => {
    test("Landing page loads within 3 seconds", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      console.log(`Landing page load time: ${loadTime}ms`);

      // Should load within 3 seconds (3000ms)
      expect(loadTime).toBeLessThan(3000);

      // Check that key content is visible
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Mission Control")).toBeVisible();
    });

    test("Login page loads within 3 seconds", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      console.log(`Login page load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);

      // Verify form is interactive
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("Dashboard loads within 3 seconds", async ({ page, context }) => {
      await setDemo(page, context);

      const startTime = Date.now();

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);

      // Dashboard should have content
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(200);
    });

    test("Documents page loads within 3 seconds", async ({ page, context }) => {
      await setDemo(page, context);

      const startTime = Date.now();

      await page.goto("/documents", { waitUntil: "domcontentloaded" });

      // Wait for table to load
      await page.waitForSelector("table tbody tr", { timeout: 5000 }).catch(() => {
        // Table might not exist, continue with test
      });

      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      console.log(`Documents page load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);
    });

    test("Messages page loads within 3 seconds", async ({ page, context }) => {
      await setDemo(page, context);

      const startTime = Date.now();

      await page.goto("/messages", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      console.log(`Messages page load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);

      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(100);
    });

    test("Provider portal loads within 3 seconds", async ({ page, context }) => {
      await setDemo(page, context);

      const startTime = Date.now();

      await page.goto("/portal/profile", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      console.log(`Provider portal load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);

      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(100);
    });
  });

  test.describe("API Response Times", () => {
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

    test("Workspace API responds within 2 seconds", async ({ page }) => {
      await page.goto("/documents");

      // Monitor API requests
      const apiRequests: Array<{ url: string; responseTime: number; status: number }> = [];

      page.on('response', async (response) => {
        if (response.url().includes('/api/workspace/')) {
          const request = response.request();
          const responseTime = response.timing().responseEnd;

          apiRequests.push({
            url: response.url(),
            responseTime: responseTime,
            status: response.status()
          });
        }
      });

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Check API response times
      apiRequests.forEach((req, index) => {
        console.log(`Workspace API ${index}: ${req.url} - ${req.responseTime}ms (${req.status})`);

        if (req.status === 200) {
          expect(req.responseTime).toBeLessThan(2000);
        }
      });

      if (apiRequests.length === 0) {
        console.log("No workspace API requests detected (might be cached or different implementation)");
      }
    });

    test("Companion API proxy responds within 2 seconds", async ({ page }) => {
      await page.goto("/benefits");

      const apiRequests: Array<{ url: string; responseTime: number; status: number }> = [];

      page.on('response', async (response) => {
        if (response.url().includes('/api/companion/')) {
          const responseTime = response.timing().responseEnd;

          apiRequests.push({
            url: response.url(),
            responseTime: responseTime,
            status: response.status()
          });
        }
      });

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Check API response times
      apiRequests.forEach((req, index) => {
        console.log(`Companion API ${index}: ${req.url} - ${req.responseTime}ms (${req.status})`);

        if (req.status === 200) {
          expect(req.responseTime).toBeLessThan(2000);
        }
      });
    });

    test("Provider API responds within 1 second", async ({ request }) => {
      const endpoints = [
        "/api/provider/profile",
        "/api/provider/programs",
        "/api/provider/families"
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request.get(endpoint);
        const responseTime = Date.now() - startTime;

        console.log(`${endpoint}: ${responseTime}ms (${response.status()})`);

        // Provider APIs should be fast (even if they return auth errors)
        expect(responseTime).toBeLessThan(1000);
      }
    });

    test("Message API responds within 1 second", async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get("/api/messages");
      const responseTime = Date.now() - startTime;

      console.log(`Messages API: ${responseTime}ms (${response.status()})`);
      expect(responseTime).toBeLessThan(1000);
    });
  });

  test.describe("Navigation Performance", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
    });

    test("Client-side navigation is fast", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const routes = [
        "/documents",
        "/messages",
        "/benefits",
        "/programs",
        "/providers"
      ];

      for (const route of routes) {
        const startTime = Date.now();

        // Click navigation link if exists
        const navLink = page.locator(`a[href="${route}"]`);

        if (await navLink.count() > 0) {
          await navLink.first().click();
        } else {
          // Direct navigation
          await page.goto(route);
        }

        await page.waitForLoadState("domcontentloaded");

        const navigationTime = Date.now() - startTime;
        console.log(`Navigation to ${route}: ${navigationTime}ms`);

        // Client-side navigation should be very fast
        expect(navigationTime).toBeLessThan(2000);

        // Verify page loaded
        expect(page.url()).toContain(route);
      }
    });

    test("Browser back/forward performance", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Navigate to a few pages
      await page.goto("/documents");
      await page.waitForLoadState("networkidle");

      await page.goto("/messages");
      await page.waitForLoadState("networkidle");

      // Test back navigation performance
      const startTime = Date.now();
      await page.goBack();
      await page.waitForLoadState("domcontentloaded");

      const backTime = Date.now() - startTime;
      console.log(`Browser back navigation: ${backTime}ms`);

      expect(backTime).toBeLessThan(1000);
      expect(page.url()).toContain("/documents");

      // Test forward navigation performance
      const forwardStart = Date.now();
      await page.goForward();
      await page.waitForLoadState("domcontentloaded");

      const forwardTime = Date.now() - forwardStart;
      console.log(`Browser forward navigation: ${forwardTime}ms`);

      expect(forwardTime).toBeLessThan(1000);
      expect(page.url()).toContain("/messages");
    });
  });

  test.describe("Resource Loading Performance", () => {
    test("CSS and JavaScript load efficiently", async ({ page }) => {
      // Monitor resource loading
      const resources: Array<{ url: string; type: string; size: number; duration: number }> = [];

      page.on('response', async (response) => {
        const request = response.request();
        const resourceType = request.resourceType();

        if (['stylesheet', 'script'].includes(resourceType)) {
          try {
            const buffer = await response.body();
            const duration = response.timing().responseEnd;

            resources.push({
              url: response.url(),
              type: resourceType,
              size: buffer.length,
              duration: duration
            });
          } catch (error) {
            // Some resources might not be accessible
          }
        }
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Analyze resource loading
      let totalCSSSize = 0;
      let totalJSSize = 0;

      resources.forEach(resource => {
        console.log(`${resource.type}: ${resource.url.split('/').pop()} - ${resource.size} bytes, ${resource.duration}ms`);

        if (resource.type === 'stylesheet') {
          totalCSSSize += resource.size;
        } else if (resource.type === 'script') {
          totalJSSize += resource.size;
        }

        // Individual resources shouldn't be too large
        expect(resource.size).toBeLessThan(1024 * 1024); // 1MB limit
        expect(resource.duration).toBeLessThan(3000); // 3s load limit
      });

      console.log(`Total CSS size: ${(totalCSSSize / 1024).toFixed(2)}KB`);
      console.log(`Total JS size: ${(totalJSSize / 1024).toFixed(2)}KB`);

      // Bundle sizes should be reasonable
      expect(totalCSSSize).toBeLessThan(500 * 1024); // 500KB CSS limit
      expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // 2MB JS limit
    });

    test("Image loading performance", async ({ page, context }) => {
      await setDemo(page, context);

      const images: Array<{ url: string; size: number; duration: number }> = [];

      page.on('response', async (response) => {
        if (response.request().resourceType() === 'image') {
          try {
            const buffer = await response.body();
            const duration = response.timing().responseEnd;

            images.push({
              url: response.url(),
              size: buffer.length,
              duration: duration
            });
          } catch (error) {
            // Some images might not be accessible
          }
        }
      });

      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Check image loading performance
      images.forEach(image => {
        console.log(`Image: ${image.url.split('/').pop()} - ${(image.size / 1024).toFixed(2)}KB, ${image.duration}ms`);

        // Images should load reasonably fast
        expect(image.duration).toBeLessThan(3000);

        // Images shouldn't be too large (unless they're hero images)
        if (image.size > 500 * 1024) {
          console.warn(`Large image detected: ${(image.size / 1024).toFixed(2)}KB - ${image.url}`);
        }
      });

      if (images.length === 0) {
        console.log("No images detected on dashboard");
      }
    });

    test("Font loading performance", async ({ page }) => {
      const fonts: Array<{ url: string; size: number; duration: number }> = [];

      page.on('response', async (response) => {
        if (response.request().resourceType() === 'font') {
          try {
            const buffer = await response.body();
            const duration = response.timing().responseEnd;

            fonts.push({
              url: response.url(),
              size: buffer.length,
              duration: duration
            });
          } catch (error) {
            // Some fonts might not be accessible
          }
        }
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Check font loading
      fonts.forEach(font => {
        console.log(`Font: ${font.url.split('/').pop()} - ${(font.size / 1024).toFixed(2)}KB, ${font.duration}ms`);

        // Fonts should load quickly
        expect(font.duration).toBeLessThan(2000);

        // Font files should be reasonably sized
        expect(font.size).toBeLessThan(200 * 1024); // 200KB per font file
      });

      if (fonts.length === 0) {
        console.log("No custom fonts detected (using system fonts)");
      }
    });
  });

  test.describe("Memory Usage Monitoring", () => {
    test("Memory usage remains stable during navigation", async ({ page, context }) => {
      await setDemo(page, context);

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (!initialMemory) {
        console.log("Memory monitoring not available in this browser");
        return;
      }

      console.log(`Initial memory usage: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);

      const routes = ["/dashboard", "/documents", "/messages", "/benefits", "/programs"];

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const memoryUsage = await page.evaluate(() => {
          return (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize
          } : null;
        });

        if (memoryUsage) {
          const memoryMB = memoryUsage.usedJSHeapSize / 1024 / 1024;
          console.log(`Memory usage at ${route}: ${memoryMB.toFixed(2)}MB`);

          // Memory shouldn't grow excessively
          expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB limit
        }
      }
    });

    test("No memory leaks during repeated navigation", async ({ page, context }) => {
      await setDemo(page, context);

      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Get baseline memory
      const baselineMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
      });

      if (!baselineMemory) {
        console.log("Memory monitoring not available");
        return;
      }

      // Repeatedly navigate between pages
      for (let i = 0; i < 5; i++) {
        await page.goto("/documents");
        await page.waitForLoadState("networkidle");
        await page.goto("/dashboard");
        await page.waitForLoadState("networkidle");
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      await page.waitForTimeout(2000);

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
      });

      if (finalMemory) {
        const memoryIncrease = finalMemory - baselineMemory;
        const increasePercent = (memoryIncrease / baselineMemory) * 100;

        console.log(`Memory increase after repeated navigation: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercent.toFixed(1)}%)`);

        // Memory increase should be minimal
        expect(increasePercent).toBeLessThan(50); // Less than 50% increase
      }
    });
  });

  test.describe("Perceived Performance", () => {
    test("First Contentful Paint timing", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null
        };
      });

      console.log("Performance metrics:", performanceMetrics);

      // First Contentful Paint should be fast
      if (performanceMetrics.firstContentfulPaint) {
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds
      }

      // DOM Content Loaded should be very fast
      if (performanceMetrics.domContentLoaded) {
        expect(performanceMetrics.domContentLoaded).toBeLessThan(1500); // 1.5 seconds
      }
    });

    test("Interaction responsiveness", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Test button click responsiveness
      const buttons = page.locator("button, a");
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const startTime = Date.now();
        await buttons.first().click();

        const interactionTime = Date.now() - startTime;
        console.log(`Button interaction response time: ${interactionTime}ms`);

        // Interactions should feel instant
        expect(interactionTime).toBeLessThan(100);
      }

      // Test input responsiveness
      const inputs = page.locator("input[type='text'], input[type='search'], textarea");
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        const input = inputs.first();

        const startTime = Date.now();
        await input.fill("test");

        const inputTime = Date.now() - startTime;
        console.log(`Input response time: ${inputTime}ms`);

        expect(inputTime).toBeLessThan(100);

        const value = await input.inputValue();
        expect(value).toBe("test");
      }
    });
  });
});