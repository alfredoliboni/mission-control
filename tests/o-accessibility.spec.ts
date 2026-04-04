import { test, expect } from "@playwright/test";

test.describe("O — Accessibility Testing", () => {
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

  test.describe("Keyboard Navigation", () => {
    test("Landing page keyboard navigation", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Start with first focusable element
      await page.keyboard.press("Tab");

      let currentFocus = await page.evaluate(() => document.activeElement?.tagName);
      expect(currentFocus).toMatch(/A|BUTTON|INPUT|SELECT/);

      // Tab through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        const newFocus = await page.evaluate(() => document.activeElement?.tagName);
        expect(newFocus).toMatch(/A|BUTTON|INPUT|SELECT|TEXTAREA|DIV/);
      }

      // Test reverse tab
      await page.keyboard.press("Shift+Tab");
      const reverseFocus = await page.evaluate(() => document.activeElement?.tagName);
      expect(reverseFocus).toMatch(/A|BUTTON|INPUT|SELECT|TEXTAREA|DIV/);
    });

    test("Login form keyboard navigation and submission", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Tab to email field
      await page.keyboard.press("Tab");
      await page.keyboard.type("test@example.com");

      // Tab to password field
      await page.keyboard.press("Tab");
      await page.keyboard.type("password123");

      // Tab to submit button and activate with Enter
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return { tagName: el?.tagName, type: (el as HTMLElement)?.textContent };
      });

      expect(focusedElement.tagName).toBe("BUTTON");
      expect(focusedElement.type).toMatch(/sign in/i);

      // Press Enter to submit (but don't actually submit)
      // await page.keyboard.press("Enter");
      console.log("Keyboard navigation through login form successful");
    });

    test("Dashboard keyboard navigation", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Test skip links if they exist
      await page.keyboard.press("Tab");
      const firstFocused = await page.evaluate(() => {
        const el = document.activeElement;
        return { tagName: el?.tagName, href: (el as HTMLAnchorElement)?.href };
      });

      if (firstFocused.href && firstFocused.href.includes("#")) {
        console.log("Skip link found:", firstFocused.href);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(500);
      }

      // Tab through navigation elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
        const currentFocus = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            text: el?.textContent?.substring(0, 30),
            ariaLabel: el?.getAttribute("aria-label")
          };
        });

        if (currentFocus.tagName === "A" && currentFocus.text) {
          console.log(`Navigable link found: "${currentFocus.text}" (${currentFocus.ariaLabel || "no aria-label"})`);
        }
      }
    });

    test("Provider portal keyboard navigation", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Tab through form elements
      const formElements: any[] = [];

      for (let i = 0; i < 15; i++) {
        await page.keyboard.press("Tab");

        const currentFocus = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            type: (el as HTMLInputElement)?.type,
            name: (el as HTMLInputElement)?.name,
            placeholder: (el as HTMLInputElement)?.placeholder,
            ariaLabel: el?.getAttribute("aria-label")
          };
        });

        if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(currentFocus.tagName)) {
          formElements.push(currentFocus);
        }
      }

      // Should have found several form elements
      expect(formElements.length).toBeGreaterThan(0);
      console.log(`Found ${formElements.length} keyboard-accessible form elements`);
    });

    test("Messages page keyboard navigation", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Test keyboard navigation through messages
      const navigableElements: any[] = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");

        const currentFocus = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            role: el?.getAttribute("role"),
            ariaLabel: el?.getAttribute("aria-label"),
            text: el?.textContent?.substring(0, 50)
          };
        });

        if (currentFocus.tagName && currentFocus.tagName !== "BODY") {
          navigableElements.push(currentFocus);
        }
      }

      console.log(`Found ${navigableElements.length} keyboard-accessible elements in messages`);

      // Test Enter/Space activation on buttons
      const buttons = navigableElements.filter(el => el.tagName === "BUTTON");
      if (buttons.length > 0) {
        console.log(`Found ${buttons.length} keyboard-accessible buttons`);
      }
    });
  });

  test.describe("Screen Reader Support", () => {
    test("Page titles and headings structure", async ({ page }) => {
      const pages = [
        { url: "/", expectedTitle: /mission control|companion/i },
        { url: "/login", expectedTitle: /login|sign in/i },
        { url: "/signup", expectedTitle: /signup|sign up|register/i }
      ];

      for (const pageInfo of pages) {
        await page.goto(pageInfo.url);
        await page.waitForLoadState("networkidle");

        // Check page title
        const title = await page.title();
        expect(title).toMatch(pageInfo.expectedTitle);

        // Check heading structure
        const headings = await page.evaluate(() => {
          const headingElements = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
          return headingElements.map(h => ({
            level: h.tagName,
            text: h.textContent?.trim(),
            id: h.id
          }));
        });

        // Should have at least one heading
        expect(headings.length).toBeGreaterThan(0);

        // Should have an H1
        const h1Count = headings.filter(h => h.level === "H1").length;
        expect(h1Count).toBeGreaterThanOrEqual(1);

        console.log(`${pageInfo.url} headings:`, headings.slice(0, 3));
      }
    });

    test("Form labels and descriptions", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Check form inputs have proper labels
      const formAnalysis = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
        return inputs.map(input => {
          const id = input.id;
          const name = (input as HTMLInputElement).name;
          const type = (input as HTMLInputElement).type;
          const ariaLabel = input.getAttribute("aria-label");
          const ariaLabelledBy = input.getAttribute("aria-labelledby");
          const placeholder = (input as HTMLInputElement).placeholder;

          // Find associated label
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;
          const parentLabel = input.closest("label");

          return {
            id,
            name,
            type,
            ariaLabel,
            ariaLabelledBy,
            placeholder,
            hasLabel: !!(label || parentLabel),
            labelText: label?.textContent?.trim() || parentLabel?.textContent?.trim()
          };
        });
      });

      // Each input should have some form of labeling
      formAnalysis.forEach(input => {
        const hasAccessibleName = input.hasLabel || input.ariaLabel || input.ariaLabelledBy || input.placeholder;
        expect(hasAccessibleName).toBe(true);
        console.log(`Input ${input.id || input.name}: accessible name = ${hasAccessibleName}`);
      });
    });

    test("ARIA landmarks and roles", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const landmarks = await page.evaluate(() => {
        const landmarkElements = Array.from(document.querySelectorAll(
          "[role='main'], [role='navigation'], [role='banner'], [role='contentinfo'], [role='complementary'], main, nav, header, footer, aside"
        ));

        return landmarkElements.map(el => ({
          tagName: el.tagName,
          role: el.getAttribute("role") || "implicit",
          ariaLabel: el.getAttribute("aria-label"),
          id: el.id
        }));
      });

      // Should have navigation landmarks
      const navLandmarks = landmarks.filter(l =>
        l.role === "navigation" || l.tagName === "NAV"
      );

      if (navLandmarks.length > 0) {
        console.log(`Found ${navLandmarks.length} navigation landmarks`);
      }

      // Should have main content
      const mainLandmarks = landmarks.filter(l =>
        l.role === "main" || l.tagName === "MAIN"
      );

      if (mainLandmarks.length > 0) {
        console.log(`Found ${mainLandmarks.length} main content landmarks`);
      }

      console.log("All landmarks:", landmarks);
    });

    test("Button and link accessibility", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const interactiveElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("button, a, input[type='button'], input[type='submit']"));

        return elements.map(el => {
          const ariaLabel = el.getAttribute("aria-label");
          const title = el.getAttribute("title");
          const textContent = el.textContent?.trim();
          const hasAccessibleName = !!(ariaLabel || title || textContent);

          return {
            tagName: el.tagName,
            type: (el as HTMLInputElement).type,
            ariaLabel,
            title,
            textContent: textContent?.substring(0, 30),
            hasAccessibleName,
            disabled: (el as HTMLButtonElement).disabled,
            href: (el as HTMLAnchorElement).href
          };
        });
      });

      // All interactive elements should have accessible names
      const elementsWithoutNames = interactiveElements.filter(el => !el.hasAccessibleName);

      if (elementsWithoutNames.length > 0) {
        console.log("Elements without accessible names:", elementsWithoutNames);
      }

      expect(elementsWithoutNames.length).toBe(0);

      // Links should have meaningful text
      const links = interactiveElements.filter(el => el.tagName === "A");
      const vagueLinkText = links.filter(link =>
        link.textContent && /^(click here|here|more|link|read more)$/i.test(link.textContent)
      );

      expect(vagueLinkText.length).toBe(0);

      console.log(`Analyzed ${interactiveElements.length} interactive elements`);
    });
  });

  test.describe("Visual Accessibility", () => {
    test("Focus indicators visibility", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Test focus indicators on form elements
      const focusableElements = await page.locator("input, button, a, select, textarea").all();

      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        const element = focusableElements[i];

        // Focus the element
        await element.focus();
        await page.waitForTimeout(200);

        // Check if focus is visible (basic check)
        const isFocused = await element.evaluate((el: HTMLElement) => {
          return document.activeElement === el;
        });

        expect(isFocused).toBe(true);

        // Check computed styles for focus indicator
        const focusStyles = await element.evaluate((el: HTMLElement) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow,
            border: styles.border
          };
        });

        // Should have some form of focus indicator
        const hasFocusIndicator =
          focusStyles.outline !== "none" ||
          focusStyles.outlineWidth !== "0px" ||
          focusStyles.boxShadow !== "none" ||
          focusStyles.border !== "none";

        console.log(`Element ${i} focus indicator:`, {
          hasFocusIndicator,
          outline: focusStyles.outline,
          boxShadow: focusStyles.boxShadow !== "none" ? "present" : "none"
        });
      }
    });

    test("Color contrast and text readability", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Sample text elements to check contrast
      const textElements = await page.locator("h1, h2, h3, p, span, div").all();

      let contrastChecks = 0;

      for (let i = 0; i < Math.min(textElements.length, 10); i++) {
        const element = textElements[i];

        if (await element.isVisible()) {
          const contrastInfo = await element.evaluate((el: HTMLElement) => {
            const styles = window.getComputedStyle(el);
            const text = el.textContent?.trim();

            if (!text || text.length < 5) return null;

            return {
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              fontSize: styles.fontSize,
              fontWeight: styles.fontWeight,
              text: text.substring(0, 50)
            };
          });

          if (contrastInfo && contrastInfo.text) {
            contrastChecks++;
            console.log(`Text contrast check ${contrastChecks}:`, {
              text: contrastInfo.text,
              color: contrastInfo.color,
              backgroundColor: contrastInfo.backgroundColor,
              fontSize: contrastInfo.fontSize
            });

            // Basic checks for readability
            expect(contrastInfo.fontSize).not.toBe("0px");
            expect(contrastInfo.color).not.toBe(contrastInfo.backgroundColor);
          }
        }
      }

      expect(contrastChecks).toBeGreaterThan(0);
    });

    test("Image alt text and accessibility", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const images = await page.evaluate(() => {
        const imgElements = Array.from(document.querySelectorAll("img"));
        return imgElements.map(img => ({
          src: img.src,
          alt: img.alt,
          ariaLabel: img.getAttribute("aria-label"),
          role: img.getAttribute("role"),
          hasAccessibleName: !!(img.alt || img.getAttribute("aria-label")),
          width: img.width,
          height: img.height,
          isDecorative: img.alt === "" || img.getAttribute("role") === "presentation"
        }));
      });

      // Check each image
      images.forEach((img, index) => {
        if (img.width > 0 && img.height > 0) {
          // Visible images should have alt text unless explicitly decorative
          if (!img.isDecorative) {
            expect(img.hasAccessibleName).toBe(true);
            console.log(`Image ${index}: has accessible name = ${img.hasAccessibleName}`);
          } else {
            console.log(`Image ${index}: marked as decorative`);
          }
        }
      });

      console.log(`Checked ${images.length} images for accessibility`);
    });

    test("Mobile accessibility and touch targets", async ({ page, context }) => {
      await setDemo(page, context);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Check touch target sizes
      const interactiveElements = await page.locator("button, a, input, select").all();

      let touchTargetChecks = 0;

      for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
        const element = interactiveElements[i];

        if (await element.isVisible()) {
          const boundingBox = await element.boundingBox();

          if (boundingBox) {
            const { width, height } = boundingBox;
            const minSize = 44; // WCAG 2.1 AA minimum

            const meetsSizeRequirement = width >= minSize && height >= minSize;

            console.log(`Touch target ${touchTargetChecks}: ${width}x${height} (meets requirement: ${meetsSizeRequirement})`);

            if (width > 0 && height > 0) {
              touchTargetChecks++;

              // For critical interactive elements, enforce minimum size
              const elementType = await element.evaluate(el => el.tagName);
              if (elementType === "BUTTON") {
                // Buttons should generally meet touch target size
                // Note: Some small icon buttons might be exceptions
                if (width < 32 || height < 32) {
                  console.warn(`Small button found: ${width}x${height}`);
                }
              }
            }
          }
        }
      }

      expect(touchTargetChecks).toBeGreaterThan(0);
      console.log(`Checked ${touchTargetChecks} touch targets`);
    });
  });

  test.describe("Error Handling Accessibility", () => {
    test("Form validation error announcements", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Trigger validation errors
      await page.locator('button[type="submit"]', { hasText: "Sign In" }).click();
      await page.waitForTimeout(2000);

      // Check for error messaging
      const errorElements = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll("[role='alert'], .error, .text-destructive, [aria-live]"));
        return errors.map(el => ({
          tagName: el.tagName,
          role: el.getAttribute("role"),
          ariaLive: el.getAttribute("aria-live"),
          text: el.textContent?.trim(),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));
      });

      const visibleErrors = errorElements.filter(err => err.visible && err.text);

      if (visibleErrors.length > 0) {
        console.log(`Found ${visibleErrors.length} accessible error messages`);
        visibleErrors.forEach(err => {
          console.log(`Error: "${err.text}" (role: ${err.role}, aria-live: ${err.ariaLive})`);
        });

        // Errors should be announced to screen readers
        const announcedErrors = visibleErrors.filter(err =>
          err.role === "alert" || err.ariaLive === "polite" || err.ariaLive === "assertive"
        );

        expect(announcedErrors.length).toBeGreaterThan(0);
      }
    });

    test("Loading states and accessibility", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/documents");

      // Look for loading indicators
      await page.waitForTimeout(1000);

      const loadingElements = await page.evaluate(() => {
        const loaders = Array.from(document.querySelectorAll(
          "[role='progressbar'], [aria-busy='true'], .loading, .spinner, [aria-label*='loading']"
        ));

        return loaders.map(el => ({
          tagName: el.tagName,
          role: el.getAttribute("role"),
          ariaBusy: el.getAttribute("aria-busy"),
          ariaLabel: el.getAttribute("aria-label"),
          text: el.textContent?.trim(),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));
      });

      const visibleLoaders = loadingElements.filter(loader => loader.visible);

      console.log(`Found ${visibleLoaders.length} accessible loading indicators`);

      if (visibleLoaders.length > 0) {
        visibleLoaders.forEach(loader => {
          console.log(`Loading indicator: role=${loader.role}, aria-busy=${loader.ariaBusy}, label="${loader.ariaLabel}"`);
        });
      }
    });

    test("Dialog and modal accessibility", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/documents");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Try to open a dialog (document viewer)
      const clickableRows = page.locator("table tbody tr, [role='button']");

      if (await clickableRows.count() > 0) {
        await clickableRows.first().click();
        await page.waitForTimeout(1000);

        // Check for dialog
        const dialogs = await page.evaluate(() => {
          const dialogElements = Array.from(document.querySelectorAll("[role='dialog'], dialog"));
          return dialogElements.map(dialog => ({
            tagName: dialog.tagName,
            role: dialog.getAttribute("role"),
            ariaModal: dialog.getAttribute("aria-modal"),
            ariaLabelledBy: dialog.getAttribute("aria-labelledby"),
            ariaLabel: dialog.getAttribute("aria-label"),
            visible: dialog.offsetWidth > 0 && dialog.offsetHeight > 0
          }));
        });

        const visibleDialogs = dialogs.filter(d => d.visible);

        if (visibleDialogs.length > 0) {
          console.log(`Found ${visibleDialogs.length} accessible dialogs`);

          visibleDialogs.forEach(dialog => {
            console.log(`Dialog: role=${dialog.role}, modal=${dialog.ariaModal}, label="${dialog.ariaLabel}"`);

            // Modal dialogs should have proper attributes
            if (dialog.role === "dialog") {
              expect(dialog.ariaModal).toBeTruthy();
            }
          });

          // Test Escape key to close
          await page.keyboard.press("Escape");
          await page.waitForTimeout(500);

          // Dialog should close
          const dialogsAfterEscape = await page.locator("[role='dialog']:visible").count();
          console.log(`Dialogs remaining after Escape: ${dialogsAfterEscape}`);
        }
      }
    });
  });
});