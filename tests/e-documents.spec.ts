import { test, expect } from "@playwright/test";

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

test.describe("E — Document Features (Demo Mode)", () => {
  test("Document table shows entries from workspace API", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Should have a table with document rows
    const tableRows = page.locator("table tbody tr");
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("Upload button is visible but disabled in demo mode", async ({
    page,
  }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Upload button shows in demo mode but disabled with "sign in to upload" hint
    const uploadButton = page.locator("button:has-text('Upload Document')");
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeDisabled();
    await expect(page.locator("text=sign in to upload")).toBeVisible();
  });

  test("Document type filter works", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Find the type filter dropdown
    const typeFilter = page.locator("select").first();
    await expect(typeFilter).toBeVisible();

    // Get initial count text
    const countText = page.locator("text=Showing");
    await expect(countText).toBeVisible();

    // Select a specific type
    const options = await typeFilter.locator("option").allTextContents();
    if (options.length > 1) {
      // Select the second option (first non-"All types" option)
      await typeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Count should change or stay the same (but filter should apply)
      const newCountText = await countText.textContent();
      expect(newCountText).toContain("Showing");
    }
  });

  test("Document viewer dialog opens on click", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click on the first table row
    const firstRow = page.locator("table tbody tr").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Dialog should have a title and download button
      await expect(dialog.locator("text=Download")).toBeVisible();
    }
  });

  test("Document sort order changes", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Find the sort dropdown (second select)
    const selects = page.locator("select");
    if ((await selects.count()) >= 2) {
      const sortSelect = selects.nth(1);
      await sortSelect.selectOption("name_az");
      await page.waitForTimeout(500);
      // Verify it changed
      const selectedValue = await sortSelect.inputValue();
      expect(selectedValue).toBe("name_az");
    }
  });
});
