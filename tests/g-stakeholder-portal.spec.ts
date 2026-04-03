import { test, expect } from "@playwright/test";

test.describe("G — Stakeholder Portal", () => {
  test("/portal loads (shows empty state or linked families)", async ({
    page,
  }) => {
    // Portal requires auth but no demo mode support — try loading
    await page.goto("/portal");
    await page.waitForLoadState("networkidle");

    // Either shows login redirect, the portal page, or the empty state
    const url = page.url();
    const body = await page.locator("body").textContent();
    // Should get login or portal content
    expect(
      url.includes("/login") ||
        body!.includes("Linked Families") ||
        body!.includes("No linked families")
    ).toBe(true);
  });

  test("/portal/upload shows upload form or login redirect", async ({
    page,
  }) => {
    await page.goto("/portal/upload");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const body = await page.locator("body").textContent();
    expect(
      url.includes("/login") || body!.includes("Upload Document")
    ).toBe(true);
  });

  test("/portal/messages shows message threads or login redirect", async ({
    page,
  }) => {
    await page.goto("/portal/messages");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const body = await page.locator("body").textContent();
    expect(
      url.includes("/login") ||
        body!.includes("Messages") ||
        body!.includes("Communicate")
    ).toBe(true);
  });
});
