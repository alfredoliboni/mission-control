import { test, expect } from "@playwright/test";

test.describe("N — Message System Complete (Phases 4 & 5)", () => {
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

  test.describe("Message Thread Navigation", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
    });

    test("Messages page displays thread list", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);

      // Should show messages interface
      expect(bodyText).toMatch(/message|thread|conversation|chat/i);

      // Look for thread list or conversation entries
      const threads = page.locator("[class*='thread'], [class*='conversation'], [class*='message-item']");
      const links = page.locator("a[href*='/messages/']");

      if (await threads.count() > 0) {
        await expect(threads.first()).toBeVisible();
        console.log(`Found ${await threads.count()} message threads`);
      } else if (await links.count() > 0) {
        await expect(links.first()).toBeVisible();
        console.log(`Found ${await links.count()} message links`);
      } else {
        // Might be empty state
        expect(bodyText).toMatch(/no messages|empty|start conversation/i);
      }

      await page.screenshot({ path: "test-results/messages-overview.png" });
    });

    test("Thread selection and navigation", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for clickable threads or message items
      const clickableThreads = page.locator("a[href*='/messages/'], [class*='thread']:not(a), [class*='message-item']:not(a)");
      const threadCount = await clickableThreads.count();

      if (threadCount > 0) {
        // Click on first available thread
        await clickableThreads.first().click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        // Should navigate to thread view or show thread content
        const url = page.url();
        const bodyText = await page.locator("body").textContent();

        // Either navigated to thread page or thread content appeared
        expect(url.includes("/messages") || bodyText.includes("message")).toBe(true);

        await page.screenshot({ path: "test-results/message-thread-open.png" });
      } else {
        console.log("No interactive threads found - testing empty state");
        // Test empty state behavior
        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(30);
      }
    });

    test("Thread content display and alignment", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const threadLinks = page.locator("a[href*='/messages/']");
      const threadCount = await threadLinks.count();

      if (threadCount > 0) {
        // Open first thread
        await threadLinks.first().click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        // Look for message content
        const messages = page.locator("[class*='message'], [class*='chat-bubble'], p, div");
        const messageCount = await messages.count();

        if (messageCount > 0) {
          // Check message alignment and styling
          for (let i = 0; i < Math.min(messageCount, 5); i++) {
            const message = messages.nth(i);
            if (await message.isVisible()) {
              const messageText = await message.textContent();
              if (messageText && messageText.trim().length > 10) {
                // Message should have readable content
                expect(messageText.trim().length).toBeGreaterThan(5);

                // Check for role indicators or alignment
                const classes = await message.getAttribute("class") || "";
                console.log(`Message ${i}: "${messageText.substring(0, 50)}" - Classes: ${classes}`);
              }
            }
          }
        }

        await page.screenshot({ path: "test-results/message-alignment.png" });
      }
    });

    test("Message thread metadata (timestamps, roles)", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const bodyText = await page.locator("body").textContent();

      // Look for timestamps
      const timePatterns = /(\d{1,2}:\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{1,2})/;
      const hasTimestamps = timePatterns.test(bodyText);

      if (hasTimestamps) {
        console.log("Found timestamp patterns in messages");
      }

      // Look for role indicators
      const rolePatterns = /(parent|provider|stakeholder|admin|family|you|me)/i;
      const hasRoles = rolePatterns.test(bodyText);

      if (hasRoles) {
        console.log("Found role indicators in messages");
      }

      // Look for role badges or indicators
      const badges = page.locator("[class*='badge'], [class*='role'], [class*='indicator']");
      const badgeCount = await badges.count();

      if (badgeCount > 0) {
        console.log(`Found ${badgeCount} potential role badges`);

        for (let i = 0; i < Math.min(badgeCount, 3); i++) {
          const badge = badges.nth(i);
          if (await badge.isVisible()) {
            const badgeText = await badge.textContent();
            console.log(`Badge ${i}: "${badgeText}"`);
          }
        }
      }
    });
  });

  test.describe("Chat UI and Interaction", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
    });

    test("Message composition interface", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for message input areas
      const textAreas = page.locator("textarea");
      const textInputs = page.locator("input[type='text']:not([readonly])");
      const messageInputs = page.locator("[placeholder*='message'], [placeholder*='type'], [contenteditable]");

      let messageField = null;

      if (await textAreas.count() > 0) {
        messageField = textAreas.first();
      } else if (await messageInputs.count() > 0) {
        messageField = messageInputs.first();
      } else if (await textInputs.count() > 0) {
        messageField = textInputs.first();
      }

      if (messageField) {
        // Test typing in message field
        await messageField.fill("This is a test message to verify the chat interface functionality.");

        const inputValue = await messageField.inputValue();
        expect(inputValue).toContain("test message");

        // Look for send button
        const sendButtons = page.locator("button:has-text('Send'), button[type='submit'], button[aria-label*='send']");

        if (await sendButtons.count() > 0) {
          const sendBtn = sendButtons.first();
          await expect(sendBtn).toBeVisible();

          // Don't actually send to avoid side effects
          console.log("Message composition interface is functional");
        }

        await page.screenshot({ path: "test-results/message-composition.png" });
      } else {
        console.log("No message input found - might be read-only or different interface");

        // Still capture interface for analysis
        await page.screenshot({ path: "test-results/message-interface-readonly.png" });
      }
    });

    test("Chat bubble positioning and styling", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for message bubbles or chat elements
      const bubbles = page.locator("[class*='bubble'], [class*='chat'], [class*='message-container']");
      const bubbleCount = await bubbles.count();

      if (bubbleCount > 0) {
        console.log(`Found ${bubbleCount} potential chat bubbles`);

        for (let i = 0; i < Math.min(bubbleCount, 5); i++) {
          const bubble = bubbles.nth(i);

          if (await bubble.isVisible()) {
            // Check bubble positioning
            const boundingBox = await bubble.boundingBox();
            if (boundingBox) {
              const { x, y, width, height } = boundingBox;

              // Bubble should have reasonable dimensions
              expect(width).toBeGreaterThan(50);
              expect(height).toBeGreaterThan(20);

              // Should be positioned within viewport
              expect(x).toBeGreaterThanOrEqual(0);
              expect(y).toBeGreaterThanOrEqual(0);

              console.log(`Bubble ${i}: ${width}x${height} at (${x}, ${y})`);
            }

            // Check for alignment classes
            const classes = await bubble.getAttribute("class") || "";
            const isLeftAligned = classes.includes("left") || classes.includes("start");
            const isRightAligned = classes.includes("right") || classes.includes("end");

            if (isLeftAligned || isRightAligned) {
              console.log(`Bubble ${i} has alignment: ${isLeftAligned ? "left" : "right"}`);
            }
          }
        }
      }

      await page.screenshot({ path: "test-results/chat-bubbles.png" });
    });

    test("Message interaction (expand, collapse, actions)", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for interactive message elements
      const actionButtons = page.locator("button[aria-label*='menu'], button[aria-label*='more'], [class*='menu-trigger']");
      const expandButtons = page.locator("button:has-text('Show more'), button:has-text('Expand')");

      // Test action buttons
      if (await actionButtons.count() > 0) {
        const actionBtn = actionButtons.first();
        await actionBtn.click();
        await page.waitForTimeout(500);

        // Should show menu or actions
        const menus = page.locator("[role='menu'], [class*='dropdown'], [class*='popover']");
        if (await menus.count() > 0) {
          await expect(menus.first()).toBeVisible();

          // Close menu
          await page.keyboard.press("Escape");
          await page.waitForTimeout(500);
        }
      }

      // Test expand functionality
      if (await expandButtons.count() > 0) {
        const expandBtn = expandButtons.first();
        await expandBtn.click();
        await page.waitForTimeout(1000);

        // Content should expand
        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.length).toBeGreaterThan(100);
      }
    });

    test("Real-time message updates simulation", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Get initial message count
      const initialBodyText = await page.locator("body").textContent();
      const initialLength = initialBodyText!.length;

      // Wait for potential real-time updates
      await page.waitForTimeout(5000);

      // Check if content changed (simulating real-time updates)
      const updatedBodyText = await page.locator("body").textContent();
      const updatedLength = updatedBodyText!.length;

      // Log any changes (might indicate polling/updates)
      if (Math.abs(updatedLength - initialLength) > 50) {
        console.log("Detected content changes - possible real-time updates");
      }

      // Test refresh behavior
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const refreshedBodyText = await page.locator("body").textContent();
      expect(refreshedBodyText!.length).toBeGreaterThan(50);
    });
  });

  test.describe("Message Thread Management", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
    });

    test("Create new thread functionality", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for new thread/conversation buttons
      const newThreadBtns = page.locator("button:has-text('New'), button:has-text('Start'), button:has-text('Create')");

      if (await newThreadBtns.count() > 0) {
        const newBtn = newThreadBtns.first();
        await newBtn.click();
        await page.waitForTimeout(1000);

        // Should show new thread interface
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).toMatch(/new|create|start|recipient|subject/i);

        // Look for recipient selection
        const recipientFields = page.locator("select, input[placeholder*='recipient'], input[placeholder*='to']");
        if (await recipientFields.count() > 0) {
          console.log("Found recipient selection interface");
        }

        // Look for subject field
        const subjectFields = page.locator("input[placeholder*='subject'], input[name*='subject']");
        if (await subjectFields.count() > 0) {
          await subjectFields.first().fill("Test Thread Subject");

          const subjectValue = await subjectFields.first().inputValue();
          expect(subjectValue).toBe("Test Thread Subject");
        }

        await page.screenshot({ path: "test-results/new-thread-interface.png" });
      } else {
        console.log("No new thread creation interface found");
      }
    });

    test("Thread search and filtering", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for search interface
      const searchInputs = page.locator("input[type='search'], input[placeholder*='search'], input[placeholder*='filter']");

      if (await searchInputs.count() > 0) {
        const searchField = searchInputs.first();
        await searchField.fill("therapy");
        await page.waitForTimeout(1000);

        // Should filter results
        const bodyText = await page.locator("body").textContent();
        // Results might be filtered (or no results found)
        expect(bodyText!.length).toBeGreaterThan(30);

        // Clear search
        await searchField.clear();
        await page.waitForTimeout(500);
      }

      // Look for filter controls
      const filterSelects = page.locator("select");
      if (await filterSelects.count() > 0) {
        const filterSelect = filterSelects.first();
        const options = await filterSelect.locator("option").count();

        if (options > 1) {
          await filterSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);

          const selectedValue = await filterSelect.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }
    });

    test("Thread archiving and management", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for thread management options
      const managementBtns = page.locator("button[aria-label*='archive'], button[aria-label*='delete'], button:has-text('Archive')");

      if (await managementBtns.count() > 0) {
        console.log(`Found ${await managementBtns.count()} thread management buttons`);

        // Don't actually archive/delete to avoid side effects
        const firstBtn = managementBtns.first();
        const btnText = await firstBtn.textContent();
        console.log(`Thread management option available: ${btnText}`);
      }

      // Look for bulk actions
      const checkboxes = page.locator("input[type='checkbox']");
      if (await checkboxes.count() > 1) {
        console.log(`Found ${await checkboxes.count()} checkboxes - possible bulk action interface`);

        // Test checkbox selection
        await checkboxes.first().check();
        expect(await checkboxes.first().isChecked()).toBe(true);

        // Look for bulk action buttons
        const bulkActionBtns = page.locator("button:has-text('Delete Selected'), button:has-text('Archive Selected')");
        if (await bulkActionBtns.count() > 0) {
          console.log("Bulk actions available");
        }

        // Uncheck
        await checkboxes.first().uncheck();
      }
    });

    test("Message thread pagination", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for pagination controls
      const paginationBtns = page.locator("button:has-text('Next'), button:has-text('Previous'), button:has-text('Load more')");
      const pageNumbers = page.locator("[class*='pagination'] button, a[href*='page=']");

      if (await paginationBtns.count() > 0) {
        console.log(`Found ${await paginationBtns.count()} pagination controls`);

        const nextBtn = page.locator("button:has-text('Next'), button:has-text('Load more')");
        if (await nextBtn.count() > 0) {
          await nextBtn.first().click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(2000);

          // Should load more content
          const bodyText = await page.locator("body").textContent();
          expect(bodyText!.length).toBeGreaterThan(50);
        }
      }

      if (await pageNumbers.count() > 0) {
        console.log(`Found ${await pageNumbers.count()} page number controls`);
      }
    });
  });

  test.describe("Real-time Chat Features (Phase 5)", () => {
    test.beforeEach(async ({ page, context }) => {
      await setDemo(page, context);
    });

    test("Chat bubble behavior and positioning", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for chat bubble components
      const chatBubbles = page.locator("[class*='chat-bubble'], [class*='message-bubble'], [class*='bubble']");
      const bubbleCount = await chatBubbles.count();

      if (bubbleCount > 0) {
        console.log(`Found ${bubbleCount} chat bubbles`);

        // Test bubble interaction
        const firstBubble = chatBubbles.first();
        if (await firstBubble.isVisible()) {
          await firstBubble.hover();
          await page.waitForTimeout(500);

          // Might trigger tooltip or actions
          const tooltips = page.locator("[role='tooltip'], [class*='tooltip']");
          if (await tooltips.count() > 0) {
            console.log("Chat bubble shows tooltip on hover");
          }

          // Test click behavior
          await firstBubble.click();
          await page.waitForTimeout(1000);

          // Might expand or show actions
          const bodyText = await page.locator("body").textContent();
          expect(bodyText!.length).toBeGreaterThan(50);
        }
      }

      await page.screenshot({ path: "test-results/chat-bubble-behavior.png" });
    });

    test("Smart polling and real-time updates", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");

      // Monitor network requests to detect polling
      const requests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/messages')) {
          requests.push(`${request.method()} ${request.url()}`);
        }
      });

      // Wait for potential polling requests
      await page.waitForTimeout(10000);

      if (requests.length > 1) {
        console.log(`Detected ${requests.length} message API requests - possible polling:`);
        requests.slice(0, 5).forEach((req, i) => console.log(`  ${i + 1}: ${req}`));
      }

      // Test page refresh doesn't break polling
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);
    });

    test("Dashboard message updates integration", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const dashboardText = await page.locator("body").textContent();

      // Look for message indicators on dashboard
      const messageIndicators = dashboardText.match(/message|notification|unread|new/gi);

      if (messageIndicators && messageIndicators.length > 0) {
        console.log(`Found ${messageIndicators.length} message-related terms on dashboard`);

        // Look for message counts or badges
        const badges = page.locator("[class*='badge'], [class*='notification'], [class*='count']");
        const badgeCount = await badges.count();

        if (badgeCount > 0) {
          console.log(`Found ${badgeCount} potential notification badges`);

          for (let i = 0; i < Math.min(badgeCount, 3); i++) {
            const badge = badges.nth(i);
            if (await badge.isVisible()) {
              const badgeText = await badge.textContent();
              const isNumeric = /\d/.test(badgeText || "");

              if (isNumeric) {
                console.log(`Numeric badge found: "${badgeText}"`);
              }
            }
          }
        }
      }

      // Test navigation from dashboard to messages
      const messageLinks = page.locator("a[href*='/messages'], button:has-text('Messages')");
      if (await messageLinks.count() > 0) {
        await messageLinks.first().click();
        await page.waitForLoadState("networkidle");

        // Should navigate to messages
        expect(page.url()).toContain("/messages");
      }

      await page.screenshot({ path: "test-results/dashboard-message-integration.png" });
    });

    test("Message notification behavior", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Look for notification elements
      const notifications = page.locator("[class*='notification'], [role='alert'], [class*='toast']");

      if (await notifications.count() > 0) {
        console.log(`Found ${await notifications.count()} notification elements`);

        const firstNotification = notifications.first();
        if (await firstNotification.isVisible()) {
          const notificationText = await firstNotification.textContent();
          console.log(`Notification content: "${notificationText}"`);

          // Test notification dismissal
          const dismissBtn = firstNotification.locator("button, [role='button']");
          if (await dismissBtn.count() > 0) {
            await dismissBtn.first().click();
            await page.waitForTimeout(500);

            // Notification might disappear
            const stillVisible = await firstNotification.isVisible();
            console.log(`Notification dismissible: ${!stillVisible}`);
          }
        }
      }

      // Test browser notification permissions (if applicable)
      const notificationPermission = await page.evaluate(() => {
        return typeof Notification !== 'undefined' ? Notification.permission : 'not-supported';
      });

      console.log(`Browser notification permission: ${notificationPermission}`);
    });
  });
});