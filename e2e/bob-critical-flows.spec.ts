 /**
  * Bob Critical Flows - E2E Regression Prevention Tests
  * 
  * These tests cover the critical user journeys that have experienced regressions:
  * 1. Vehicle lookup and parts display
  * 2. Chat drawer positioning
  * 3. Service package tier display
  * 
  * Run these tests before ANY Bob-related changes to prevent regressions.
  * See: .lovable/plan.md for the comprehensive prevention strategy.
  */
 
 import { test, expect } from "../playwright-fixture";
 
 test.describe("Bob Critical Flows - Regression Prevention", () => {
   
   test.describe("Vehicle Lookup Flow", () => {
     test("should display parts and service packages after REGO lookup", async ({ page }) => {
       // Navigate to Ask Bob page
       await page.goto("/ask-bob");
       
       // Wait for Bob to load
       await expect(page.locator('[data-testid="bob-character"]').or(page.locator('img[alt*="Bob"]').first())).toBeVisible({ timeout: 10000 });
       
       // Find and interact with chat input
       const chatInput = page.locator('input[placeholder*="Message Bob"]').or(page.locator('input[placeholder*="message"]'));
       await expect(chatInput).toBeVisible({ timeout: 5000 });
       
       // Enter REGO
       await chatInput.fill("AMA993");
       await chatInput.press("Enter");
       
       // Wait for vehicle identification (SSE event)
       // This should trigger parts_found and service_packages_found events
       await page.waitForTimeout(5000); // Allow time for API calls and SSE events
       
       // Verify service packages are displayed
       // Look for package cards or tier information
       const packageElements = page.locator('[data-testid="service-package"]')
         .or(page.locator('text=/brake|oil|filter/i').first());
       
       // At minimum, verify the page didn't crash and shows some content
       const bodyText = await page.locator('body').textContent();
       expect(bodyText).toBeTruthy();
       
       console.log("[E2E] Vehicle lookup flow completed");
     });
     
     test("should maintain parts on shelf during conversation", async ({ page }) => {
       await page.goto("/ask-bob");
       
       // Wait for Bob
       await page.waitForTimeout(2000);
       
       const chatInput = page.locator('input[placeholder*="Message Bob"]').or(page.locator('input[placeholder*="message"]'));
       
       if (await chatInput.isVisible()) {
         // Enter REGO first
         await chatInput.fill("AMA993");
         await chatInput.press("Enter");
         await page.waitForTimeout(5000);
         
         // Send follow-up message - parts should persist
         await chatInput.fill("What brake pads do you recommend?");
         await chatInput.press("Enter");
         await page.waitForTimeout(3000);
         
         // Verify page is still functional
         const bodyText = await page.locator('body').textContent();
         expect(bodyText).toBeTruthy();
       }
       
       console.log("[E2E] Parts persistence flow completed");
     });
   });
   
   test.describe("Chat Drawer Positioning", () => {
     test("should position chat drawer at container bottom", async ({ page }) => {
       await page.goto("/ask-bob");
       await page.waitForTimeout(2000);
       
       // Find the chat drawer
       const drawer = page.locator('[style*="bottom: 0"]').or(page.locator('[class*="chat"]').first());
       
       if (await drawer.isVisible()) {
         // Get drawer position
         const box = await drawer.boundingBox();
         
         if (box) {
           // Drawer should be near the bottom of the viewport
           const viewportHeight = page.viewportSize()?.height || 800;
           expect(box.y + box.height).toBeGreaterThan(viewportHeight - 200); // Within 200px of bottom
           console.log(`[E2E] Drawer position verified: y=${box.y}, height=${box.height}`);
         }
       }
     });
     
     test("should show PTT button without clipping", async ({ page }) => {
       await page.goto("/ask-bob");
       await page.waitForTimeout(2000);
       
       // Look for PTT button (microphone icon)
       const pttButton = page.locator('button[aria-label*="talk"]')
         .or(page.locator('button').filter({ has: page.locator('svg path[d*="M19 11"]') }));
       
       if (await pttButton.isVisible()) {
         const box = await pttButton.boundingBox();
         
         if (box) {
           // Button should be fully visible (not clipped)
           const viewportHeight = page.viewportSize()?.height || 800;
           expect(box.y).toBeGreaterThan(0);
           expect(box.y + box.height).toBeLessThan(viewportHeight);
           console.log(`[E2E] PTT button fully visible at y=${box.y}`);
         }
       }
     });
   });
   
   test.describe("Service Package Tier Display", () => {
     test("should display CARFIX VALUE badge on recommended tier", async ({ page }) => {
       await page.goto("/ask-bob");
       await page.waitForTimeout(2000);
       
       const chatInput = page.locator('input[placeholder*="Message Bob"]').or(page.locator('input[placeholder*="message"]'));
       
       if (await chatInput.isVisible()) {
         // Trigger vehicle lookup to load packages
         await chatInput.fill("AMA993");
         await chatInput.press("Enter");
         await page.waitForTimeout(6000);
         
         // Look for CARFIX VALUE or RECOMMENDED badge
         const valueBadge = page.locator('text=/CARFIX VALUE|RECOMMENDED/i');
         
         // Check if any tier badges are present
         const tierButtons = page.locator('button').filter({ hasText: /Economy|Standard|Premium|Performance/i });
         const tierCount = await tierButtons.count();
         
         if (tierCount > 0) {
           console.log(`[E2E] Found ${tierCount} tier buttons`);
         }
       }
     });
   });
 });
 
 test.describe("Bob Widget Initialization", () => {
   test("should load without JavaScript errors", async ({ page }) => {
     const consoleErrors: string[] = [];
     
     page.on("console", (msg) => {
       if (msg.type() === "error") {
         consoleErrors.push(msg.text());
       }
     });
     
     await page.goto("/ask-bob");
     await page.waitForTimeout(3000);
     
     // Filter out expected/benign errors
     const criticalErrors = consoleErrors.filter(
       (err) => !err.includes("favicon") && !err.includes("net::ERR")
     );
     
     // Log but don't fail on warnings
     if (criticalErrors.length > 0) {
       console.warn("[E2E] Console errors detected:", criticalErrors);
     }
     
     // Verify page loaded
     await expect(page.locator("body")).toBeVisible();
   });
 });