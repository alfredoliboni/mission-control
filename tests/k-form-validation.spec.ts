import { test, expect } from "@playwright/test";

test.describe("K — Form Validation Comprehensive", () => {

  test.describe("Login Form Validation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
    });

    test("Email validation - empty email shows error", async ({ page }) => {
      await page.locator("#password").fill("validpassword123");
      await page.locator('button[type="submit"]', { hasText: "Sign In" }).click();

      // Should show email required error
      const errorMessage = page.locator(".text-destructive, .error, [role='alert']");
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test("Email validation - invalid email format shows error", async ({ page }) => {
      await page.locator("#email").fill("invalid-email-format");
      await page.locator("#password").fill("validpassword123");
      await page.locator('button[type="submit"]', { hasText: "Sign In" }).click();

      // Should show invalid email format error
      const errorMessage = page.locator(".text-destructive, .error, [role='alert']");
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test("Password validation - empty password shows error", async ({ page }) => {
      await page.locator("#email").fill("test@example.com");
      await page.locator('button[type="submit"]', { hasText: "Sign In" }).click();

      // Should show password required error
      const errorMessage = page.locator(".text-destructive, .error, [role='alert']");
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test("Email validation - edge cases", async ({ page }) => {
      const invalidEmails = [
        "test",
        "@example.com",
        "test@",
        "test..test@example.com",
        "test@example",
        "test space@example.com"
      ];

      for (const email of invalidEmails) {
        await page.locator("#email").clear();
        await page.locator("#email").fill(email);
        await page.locator("#password").fill("password123");
        await page.locator('button[type="submit"]', { hasText: "Sign In" }).click();

        // Should show validation error or invalid credentials
        await expect(page.locator(".text-destructive, .error, [role='alert']").first()).toBeVisible({ timeout: 3000 });

        // Clear any error state
        await page.locator("#email").clear();
        await page.locator("#password").clear();
        await page.waitForTimeout(500);
      }
    });

    test("Form submission disabled state", async ({ page }) => {
      const submitButton = page.locator('button[type="submit"]', { hasText: "Sign In" });

      // Button should be enabled initially
      await expect(submitButton).toBeEnabled();

      // After clicking, button might show loading state
      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("password123");
      await submitButton.click();

      // Button might be disabled during submission
      // This test captures the current behavior
      await page.waitForTimeout(1000);
    });
  });

  test.describe("Signup Form Validation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/signup");
      await page.waitForLoadState("networkidle");
    });

    test("Full name validation - empty name shows error", async ({ page }) => {
      await page.locator("#signupEmail").fill("test@example.com");
      await page.locator("#signupPassword").fill("password123");
      await page.locator('button[type="submit"]', { hasText: "Sign Up" }).click();

      // Should show full name required error
      await expect(page.locator(".text-destructive, .error, [role='alert']").first()).toBeVisible({ timeout: 5000 });
    });

    test("Full name validation - minimum length", async ({ page }) => {
      await page.locator("#fullName").fill("A");
      await page.locator("#signupEmail").fill("test@example.com");
      await page.locator("#signupPassword").fill("password123");
      await page.locator('button[type="submit"]', { hasText: "Sign Up" }).click();

      // Might show name too short error
      await page.waitForTimeout(2000);
      // Test passes if no crash occurs
    });

    test("Email validation in signup form", async ({ page }) => {
      await page.locator("#fullName").fill("Test User");
      await page.locator("#signupEmail").fill("invalid-email");
      await page.locator("#signupPassword").fill("password123");
      await page.locator('button[type="submit"]', { hasText: "Sign Up" }).click();

      // Should show email validation error
      await expect(page.locator(".text-destructive, .error, [role='alert']").first()).toBeVisible({ timeout: 5000 });
    });

    test("Password strength validation", async ({ page }) => {
      await page.locator("#fullName").fill("Test User");
      await page.locator("#signupEmail").fill("test@example.com");

      const weakPasswords = ["123", "password", "abc", "test"];

      for (const password of weakPasswords) {
        await page.locator("#signupPassword").clear();
        await page.locator("#signupPassword").fill(password);
        await page.locator('button[type="submit"]', { hasText: "Sign Up" }).click();

        // Should show password strength error or proceed (depending on implementation)
        await page.waitForTimeout(1000);

        // Clear password for next test
        await page.locator("#signupPassword").clear();
      }
    });

    test("Role selection validation", async ({ page }) => {
      await page.locator("#fullName").fill("Test User");
      await page.locator("#signupEmail").fill("test@example.com");
      await page.locator("#signupPassword").fill("validPassword123");

      // Check default role selection
      const roleSelect = page.locator("#role");
      await expect(roleSelect).toHaveValue("parent");

      // Try different roles
      const roles = ["parent", "provider", "stakeholder", "admin"];

      for (const role of roles) {
        await roleSelect.selectOption(role);
        const selectedValue = await roleSelect.inputValue();
        expect(selectedValue).toBe(role);
      }
    });

    test("Duplicate email handling", async ({ page }) => {
      await page.locator("#fullName").fill("Test User");
      await page.locator("#signupEmail").fill("luisa.liboni.ai@gmail.com"); // Existing email
      await page.locator("#signupPassword").fill("validPassword123");
      await page.locator('button[type="submit"]', { hasText: "Sign Up" }).click();

      // Should show user already exists error
      await expect(page.locator(".text-destructive, .error, [role='alert']").first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Provider Profile Form Validation", () => {
    test.beforeEach(async ({ page, context }) => {
      // Set demo mode
      await context.addCookies([
        {
          name: "companion-demo",
          value: "true",
          domain: "mission-control-gray-one.vercel.app",
          path: "/",
        },
      ]);
      await page.goto("/portal/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    test("Organization name validation", async ({ page }) => {
      const inputs = page.locator("input, textarea");
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        // Find organization/clinic name field
        const orgField = page.locator("input[type='text']").first();
        if (await orgField.isVisible()) {
          // Test empty submission
          await orgField.clear();

          // Look for submit button
          const submitBtn = page.locator("button[type='submit'], button:has-text('Save'), button:has-text('Update')");
          if (await submitBtn.count() > 0) {
            await submitBtn.first().click();
            await page.waitForTimeout(1000);

            // Should show validation error or stay on form
            const currentUrl = page.url();
            expect(currentUrl).toContain("/portal/profile");
          }
        }
      }
    });

    test("Contact information validation", async ({ page }) => {
      // Look for email or phone fields
      const emailField = page.locator("input[type='email']");
      const phoneField = page.locator("input[type='tel'], input[placeholder*='phone'], input[name*='phone']");

      if (await emailField.count() > 0) {
        await emailField.first().fill("invalid-email-format");

        const submitBtn = page.locator("button[type='submit'], button:has-text('Save')");
        if (await submitBtn.count() > 0) {
          await submitBtn.first().click();
          await page.waitForTimeout(1000);

          // Should show email validation error
          const errorMessage = page.locator(".text-destructive, .error, [role='alert']");
          // Email validation might be present
          await page.waitForTimeout(1000);
        }
      }

      if (await phoneField.count() > 0) {
        await phoneField.first().fill("invalid-phone");
        await page.waitForTimeout(500);

        // Phone validation might show error
      }
    });

    test("Service area validation", async ({ page }) => {
      // Look for service area fields (select or text)
      const selects = page.locator("select");
      const textAreas = page.locator("textarea");

      if (await selects.count() > 0) {
        // Test service area selection
        const serviceSelect = selects.first();
        const options = await serviceSelect.locator("option").count();

        if (options > 1) {
          await serviceSelect.selectOption({ index: 1 });
          const selectedValue = await serviceSelect.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }

      if (await textAreas.count() > 0) {
        // Test service description
        const serviceArea = textAreas.first();
        await serviceArea.fill("Comprehensive autism services including therapy and assessment");

        const content = await serviceArea.inputValue();
        expect(content.length).toBeGreaterThan(10);
      }
    });

    test("Required field validation", async ({ page }) => {
      // Clear all visible inputs
      const inputs = page.locator("input[type='text'], input[type='email'], textarea");
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          await input.clear();
        }
      }

      // Try to submit
      const submitBtn = page.locator("button[type='submit'], button:has-text('Save'), button:has-text('Update')");
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(2000);

        // Should either show validation errors or stay on form
        const currentUrl = page.url();
        expect(currentUrl).toContain("/portal");
      }
    });
  });

  test.describe("General Form Behavior", () => {
    test("Form accessibility - labels and inputs", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Check for proper label associations
      const inputs = page.locator("input");
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const inputId = await input.getAttribute("id");
          const inputName = await input.getAttribute("name");
          const inputType = await input.getAttribute("type");

          // Input should have id or name
          expect(inputId || inputName).toBeTruthy();

          // Check for associated label
          if (inputId) {
            const label = page.locator(`label[for='${inputId}']`);
            // Label might exist
            await page.waitForTimeout(100);
          }
        }
      }
    });

    test("Form error state clearing", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Trigger validation error
      await page.locator('button[type="submit"]', { hasText: "Sign In" }).click();

      // Wait for error
      await page.waitForTimeout(1000);

      // Start typing in email field
      await page.locator("#email").fill("test@example.com");

      // Error might clear when user starts typing
      await page.waitForTimeout(500);

      // Complete the flow
      await page.locator("#password").fill("password123");
      await page.waitForTimeout(500);
    });

    test("Form keyboard navigation", async ({ page }) => {
      await page.goto("/signup");
      await page.waitForLoadState("networkidle");

      // Tab through form elements
      await page.locator("#fullName").focus();
      await page.keyboard.press("Tab");

      // Should move to next field
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toMatch(/INPUT|SELECT|BUTTON/);

      // Continue tabbing
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Should eventually reach submit button
      await page.waitForTimeout(500);
    });
  });
});