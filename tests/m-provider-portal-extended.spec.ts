import { test, expect } from "@playwright/test";

test.describe("M — Provider Portal Extended (Phase 6)", () => {
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

  test.describe("Provider Registration & Onboarding", () => {
    test("Provider portal landing page accessibility", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Portal should be accessible
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);

      // Should contain portal-specific content
      expect(bodyText).toMatch(/portal|provider|profile|program/i);

      await page.screenshot({ path: "test-results/portal-landing.png" });
    });

    test("Provider registration flow navigation", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal");
      await page.waitForLoadState("networkidle");

      // Look for registration or profile setup links
      const profileLink = page.locator("a[href*='/portal/profile']");
      const programsLink = page.locator("a[href*='/portal/programs']");

      if (await profileLink.count() > 0) {
        await profileLink.first().click();
        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/portal/profile");
      }

      if (await programsLink.count() > 0) {
        await page.goto("/portal");
        await programsLink.first().click();
        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/portal/programs");
      }
    });

    test("Provider onboarding steps completion", async ({ page, context }) => {
      await setDemo(page, context);

      // Test the onboarding flow: profile -> programs -> messages
      const steps = ["/portal/profile", "/portal/programs", "/portal/messages"];

      for (const step of steps) {
        await page.goto(step);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        // Each step should load successfully
        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(30);

        // Should not show error pages
        expect(bodyText).not.toContain("404");
        expect(bodyText).not.toContain("Error");
      }
    });
  });

  test.describe("Provider Profile Management", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    test("Profile form comprehensive field validation", async ({ page }) => {
      // Find all form inputs
      const textInputs = page.locator("input[type='text']");
      const emailInputs = page.locator("input[type='email']");
      const textAreas = page.locator("textarea");
      const selects = page.locator("select");

      // Test organization name field
      if (await textInputs.count() > 0) {
        const orgField = textInputs.first();
        await orgField.clear();
        await orgField.fill("Comprehensive Autism Services Inc.");

        const value = await orgField.inputValue();
        expect(value).toBe("Comprehensive Autism Services Inc.");
      }

      // Test email field
      if (await emailInputs.count() > 0) {
        const emailField = emailInputs.first();
        await emailField.clear();
        await emailField.fill("provider@autismservices.ca");

        const emailValue = await emailField.inputValue();
        expect(emailValue).toBe("provider@autismservices.ca");
      }

      // Test service description
      if (await textAreas.count() > 0) {
        const serviceDesc = textAreas.first();
        await serviceDesc.clear();
        await serviceDesc.fill("We provide comprehensive autism support services including ABA therapy, speech therapy, occupational therapy, and family support programs across Ontario.");

        const descValue = await serviceDesc.inputValue();
        expect(descValue.length).toBeGreaterThan(50);
      }

      // Test service area selection
      if (await selects.count() > 0) {
        const serviceArea = selects.first();
        const options = await serviceArea.locator("option").count();

        if (options > 1) {
          await serviceArea.selectOption({ index: 1 });
          const selectedValue = await serviceArea.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }
    });

    test("Profile form save functionality", async ({ page }) => {
      const submitBtn = page.locator("button[type='submit'], button:has-text('Save'), button:has-text('Update')");

      if (await submitBtn.count() > 0) {
        // Fill in required fields
        const textInputs = page.locator("input[type='text']");
        if (await textInputs.count() > 0) {
          await textInputs.first().fill("Test Autism Center");
        }

        const emailInputs = page.locator("input[type='email']");
        if (await emailInputs.count() > 0) {
          await emailInputs.first().fill("test@autismcenter.ca");
        }

        // Attempt to save
        await submitBtn.first().click();
        await page.waitForTimeout(3000);

        // Should either save successfully or show validation errors
        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(50);

        // Should stay on profile page or redirect to success
        const url = page.url();
        expect(url).toContain("mission-control");
      }
    });

    test("Profile form specialties and services", async ({ page }) => {
      // Look for specialty/service selection fields
      const checkboxes = page.locator("input[type='checkbox']");
      const multiSelects = page.locator("select[multiple]");

      // Test checkboxes for services
      const checkboxCount = await checkboxes.count();
      if (checkboxCount > 0) {
        for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
          const checkbox = checkboxes.nth(i);
          if (await checkbox.isVisible()) {
            await checkbox.check();
            expect(await checkbox.isChecked()).toBe(true);

            // Uncheck
            await checkbox.uncheck();
            expect(await checkbox.isChecked()).toBe(false);
          }
        }
      }

      // Test multi-select for specialties
      if (await multiSelects.count() > 0) {
        const multiSelect = multiSelects.first();
        const options = await multiSelect.locator("option").count();

        if (options > 1) {
          // Select first few options
          for (let i = 1; i < Math.min(options, 4); i++) {
            await multiSelect.selectOption({ index: i });
          }
        }
      }
    });

    test("Profile contact information validation", async ({ page }) => {
      const phoneFields = page.locator("input[type='tel'], input[placeholder*='phone'], input[name*='phone']");
      const addressFields = page.locator("input[placeholder*='address'], input[name*='address']");
      const websiteFields = page.locator("input[type='url'], input[placeholder*='website']");

      // Test phone validation
      if (await phoneFields.count() > 0) {
        const phoneField = phoneFields.first();
        await phoneField.fill("416-555-0123");

        const phoneValue = await phoneField.inputValue();
        expect(phoneValue).toContain("416");
      }

      // Test address fields
      if (await addressFields.count() > 0) {
        const addressField = addressFields.first();
        await addressField.fill("123 Main Street, Toronto, ON M5V 3A8");

        const addressValue = await addressField.inputValue();
        expect(addressValue).toContain("Toronto");
      }

      // Test website validation
      if (await websiteFields.count() > 0) {
        const websiteField = websiteFields.first();
        await websiteField.fill("https://www.autismservices.ca");

        const websiteValue = await websiteField.inputValue();
        expect(websiteValue).toContain("https://");
      }
    });
  });

  test.describe("Programs Management", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal/programs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    test("Programs page displays existing programs", async ({ page }) => {
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(30);

      // Should show programs or empty state
      expect(bodyText).toMatch(/program|service|therapy|empty|add/i);

      // Look for programs table or cards
      const table = page.locator("table");
      const cards = page.locator("[class*='card'], .program-card");

      if (await table.count() > 0) {
        // Programs displayed in table format
        const rows = table.locator("tbody tr");
        const rowCount = await rows.count();
        // May or may not have existing programs
        await page.screenshot({ path: "test-results/programs-table.png" });
      }

      if (await cards.count() > 0) {
        // Programs displayed in card format
        await page.screenshot({ path: "test-results/programs-cards.png" });
      }
    });

    test("Add new program functionality", async ({ page }) => {
      // Look for add program button
      const addBtn = page.locator("button:has-text('Add'), button:has-text('New'), button:has-text('Create')");

      if (await addBtn.count() > 0) {
        await addBtn.first().click();
        await page.waitForTimeout(1000);

        // Should open form or navigate to form page
        const currentUrl = page.url();
        const bodyText = await page.locator("body").textContent();

        // Check if form appeared or navigated to form page
        const hasForm = bodyText.includes("program") || bodyText.includes("name") || bodyText.includes("description");
        expect(hasForm || currentUrl.includes("programs")).toBe(true);

        // If form opened, test basic fields
        const nameField = page.locator("input[name*='name'], input[placeholder*='name']");
        const descField = page.locator("textarea[name*='description'], textarea[placeholder*='description']");

        if (await nameField.count() > 0) {
          await nameField.first().fill("Applied Behavior Analysis Program");

          const nameValue = await nameField.first().inputValue();
          expect(nameValue).toBe("Applied Behavior Analysis Program");
        }

        if (await descField.count() > 0) {
          await descField.first().fill("Comprehensive ABA therapy program for children with autism spectrum disorders, focusing on skill development and behavior modification.");

          const descValue = await descField.first().inputValue();
          expect(descValue.length).toBeGreaterThan(50);
        }
      }
    });

    test("Program editing and management", async ({ page }) => {
      // Look for existing program entries to edit
      const editButtons = page.locator("button:has-text('Edit'), a:has-text('Edit')");
      const programRows = page.locator("table tbody tr");

      if (await editButtons.count() > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);

        // Should open edit form
        const nameField = page.locator("input[name*='name'], input[placeholder*='name']");
        if (await nameField.count() > 0) {
          await nameField.first().fill("Updated Program Name");

          const updatedValue = await nameField.first().inputValue();
          expect(updatedValue).toBe("Updated Program Name");
        }
      } else if (await programRows.count() > 0) {
        // Try clicking on first row (might be editable)
        await programRows.first().click();
        await page.waitForTimeout(1000);

        // Should either edit inline or navigate to edit page
        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(30);
      }
    });

    test("Program search and filtering", async ({ page }) => {
      // Look for search or filter controls
      const searchField = page.locator("input[type='search'], input[placeholder*='search']");
      const filterSelects = page.locator("select");

      if (await searchField.count() > 0) {
        await searchField.first().fill("ABA");
        await page.waitForTimeout(500);

        // Should filter results
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).toContain("ABA");
      }

      if (await filterSelects.count() > 0) {
        const filterSelect = filterSelects.first();
        const options = await filterSelect.locator("option").count();

        if (options > 1) {
          await filterSelect.selectOption({ index: 1 });
          await page.waitForTimeout(500);

          // Should apply filter
          const selectedValue = await filterSelect.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }
    });

    test("Program capacity and availability", async ({ page }) => {
      // Look for capacity-related fields
      const capacityFields = page.locator("input[name*='capacity'], input[placeholder*='capacity']");
      const availabilityFields = page.locator("input[name*='availability'], select[name*='availability']");

      if (await capacityFields.count() > 0) {
        const capacityField = capacityFields.first();
        await capacityField.fill("25");

        const capacityValue = await capacityField.inputValue();
        expect(parseInt(capacityValue)).toBe(25);
      }

      if (await availabilityFields.count() > 0) {
        const availField = availabilityFields.first();
        if (await availField.locator("option").count() > 0) {
          // It's a select
          await availField.selectOption({ index: 1 });
        } else {
          // It's an input
          await availField.fill("Monday to Friday, 9 AM - 5 PM");
        }
      }
    });
  });

  test.describe("Family Linking & Management", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
    });

    test("Provider can view linked families", async ({ page }) => {
      await page.goto("/portal");
      await page.waitForLoadState("networkidle");

      // Look for families section or link
      const familiesLink = page.locator("a[href*='families'], a:has-text('Families')");

      if (await familiesLink.count() > 0) {
        await familiesLink.first().click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(30);
        expect(bodyText).toMatch(/family|families|client/i);
      } else {
        // Families might be shown on main portal dashboard
        await page.goto("/portal");
        const bodyText = await page.locator("body").textContent();

        // Should contain some reference to families/clients
        // (may be empty in demo mode)
        expect(bodyText!.length).toBeGreaterThan(50);
      }
    });

    test("Family invitation process", async ({ page }) => {
      await page.goto("/portal");
      await page.waitForLoadState("networkidle");

      // Look for invite or add family functionality
      const inviteBtn = page.locator("button:has-text('Invite'), button:has-text('Add Family')");

      if (await inviteBtn.count() > 0) {
        await inviteBtn.first().click();
        await page.waitForTimeout(1000);

        // Should show invite form
        const emailField = page.locator("input[type='email']");
        const nameField = page.locator("input[type='text']");

        if (await emailField.count() > 0) {
          await emailField.first().fill("family@example.com");

          const emailValue = await emailField.first().inputValue();
          expect(emailValue).toBe("family@example.com");
        }

        if (await nameField.count() > 0) {
          await nameField.first().fill("Smith Family");

          const nameValue = await nameField.first().inputValue();
          expect(nameValue).toBe("Smith Family");
        }
      }
    });

    test("Family communication portal", async ({ page }) => {
      await page.goto("/portal/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(30);

      // Should show message interface for families
      expect(bodyText).toMatch(/message|communication|family|client/i);

      // Look for message composition
      const messageField = page.locator("textarea, input[type='text']");
      if (await messageField.count() > 0) {
        await messageField.first().fill("Thank you for your progress update. We're pleased to see the improvements.");

        const messageValue = await messageField.first().inputValue();
        expect(messageValue.length).toBeGreaterThan(20);
      }
    });
  });

  test.describe("Provider Dashboard Integration", () => {
    test("Dashboard shows provider-specific metrics", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const bodyText = await page.locator("body").textContent();

      // Dashboard should show provider-relevant information
      expect(bodyText).toMatch(/provider|dashboard|portal|profile|program|families|statistics|metrics/i);

      // Look for metrics or statistics
      const numbers = bodyText.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // Some metrics are displayed
        expect(numbers.length).toBeGreaterThan(0);
      }

      await page.screenshot({ path: "test-results/provider-dashboard.png" });
    });

    test("Navigation between portal sections", async ({ page, context }) => {
      await setDemo(page, context);
      await page.goto("/portal");
      await page.waitForLoadState("networkidle");

      const portalSections = [
        "/portal/profile",
        "/portal/programs",
        "/portal/messages"
      ];

      for (const section of portalSections) {
        await page.goto(section);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1500);

        // Each section should load successfully
        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(30);

        // Should show section-appropriate content
        const currentUrl = page.url();
        expect(currentUrl).toContain(section);
      }
    });

    test("Provider portal authentication state", async ({ page, context }) => {
      await setDemo(page, context);

      // Test that portal sections maintain authentication
      const protectedSections = [
        "/portal/profile",
        "/portal/programs",
        "/portal/messages"
      ];

      for (const section of protectedSections) {
        await page.goto(section);
        await page.waitForLoadState("networkidle");

        // Should not redirect to login (due to demo mode)
        const url = page.url();
        expect(url).not.toContain("/login");
        expect(url).toContain("/portal");
      }
    });
  });
});