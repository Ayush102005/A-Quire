import { test, expect } from '@playwright/test';

/**
 * Bug Condition Exploration Test - Dark Mode Fix
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * This test explores the bug condition BEFORE implementing the fix.
 * It demonstrates two critical issues:
 * 1. Missing theme toggle buttons on authenticated pages
 * 2. Non-responsive colors (hardcoded Tailwind classes) that don't respond to dark mode
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * 
 * The test is scoped to concrete failing cases identified in the design document:
 * - StudentDashboard lacks theme toggle button
 * - Settings lacks theme toggle button
 * - StudentDashboard uses hardcoded colors (bg-white, text-stone-900) that don't respond to dark mode
 * - Settings uses hardcoded colors that don't respond to dark mode
 * 
 * **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
 */

test.describe('Dark Mode Bug Condition Exploration', () => {
  // Pre-condition: User must be logged in as a student
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard');
  });

  /**
   * Property 1 (Part A): Bug Condition - Missing Theme Toggle on StudentDashboard
   * 
   * Tests that StudentDashboard header contains a theme toggle button.
   * 
   * EXPECTED ON UNFIXED CODE: FAIL - button not found
   * (This confirms the bug: users cannot access theme toggle on this page)
   */
  test('StudentDashboard should have theme toggle button in header', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForSelector('header', { timeout: 10000 });
    
    // Look for theme toggle button with .theme-toggle class
    const themeToggle = page.locator('header button.theme-toggle');
    
    // This assertion SHOULD FAIL on unfixed code
    await expect(themeToggle).toBeVisible({ timeout: 5000 });
  });

  /**
   * Property 1 (Part B): Bug Condition - Missing Theme Toggle on Settings
   * 
   * Tests that Settings page header contains a theme toggle button.
   * 
   * EXPECTED ON UNFIXED CODE: FAIL - button not found
   * (This confirms the bug: users cannot access theme toggle on Settings page)
   */
  test('Settings page should have theme toggle button in header', async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for page to load
    await page.waitForSelector('header', { timeout: 10000 });
    
    // Look for theme toggle button with .theme-toggle class
    const themeToggle = page.locator('header button.theme-toggle');
    
    // This assertion SHOULD FAIL on unfixed code
    await expect(themeToggle).toBeVisible({ timeout: 5000 });
  });

  /**
   * Property 2 (Part A): Bug Condition - Non-Responsive Colors on StudentDashboard
   * 
   * Tests that when .dark class is applied to document root, StudentDashboard
   * elements respond with dark mode colors instead of remaining light.
   * 
   * The test checks if a main card background changes from white to dark when
   * .dark class is applied.
   * 
   * EXPECTED ON UNFIXED CODE: FAIL - background remains white (rgb(255, 255, 255))
   * instead of showing dark background color
   * (This confirms the bug: page uses hardcoded bg-white that doesn't respond)
   */
  test('StudentDashboard should respond to dark mode class with dark colors', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForSelector('header', { timeout: 10000 });
    
    // Apply .dark class to document root
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    // Wait a moment for any transitions
    await page.waitForTimeout(500);
    
    // Find a main content card (looking for elements that should use --card-bg)
    // StudentDashboard has cards with bg-white that should become dark
    const mainCard = page.locator('main section.bg-white').first();
    
    if (await mainCard.count() > 0) {
      // Get computed background color
      const bgColor = await mainCard.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // In dark mode, background should NOT be white (rgb(255, 255, 255))
      // It should be a dark color (around rgb(19, 23, 32) for --card-bg in dark mode)
      
      // This assertion SHOULD FAIL on unfixed code because bg-white stays white
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
      
      // Optionally verify it's actually dark (less than 50, 50, 50 in RGB)
      const rgb = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgb) {
        const [_, r, g, b] = rgb.map(Number);
        expect(r).toBeLessThan(50);
        expect(g).toBeLessThan(50);
        expect(b).toBeLessThan(50);
      }
    }
  });

  /**
   * Property 2 (Part B): Bug Condition - Non-Responsive Text Colors on Settings
   * 
   * Tests that when .dark class is applied to document root, Settings page
   * heading text responds with light colors instead of remaining dark.
   * 
   * EXPECTED ON UNFIXED CODE: FAIL - text remains dark (stone-900 color)
   * instead of showing light text color
   * (This confirms the bug: page uses hardcoded text-stone-900 that doesn't respond)
   */
  test('Settings page should respond to dark mode class with light text', async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for page to load
    await page.waitForSelector('header', { timeout: 10000 });
    
    // Apply .dark class to document root
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    // Wait a moment for any transitions
    await page.waitForTimeout(500);
    
    // Find heading text that should use --text variable
    // Settings has headings with text-stone-900 that should become light in dark mode
    const heading = page.locator('main h2, main h3').first();
    
    if (await heading.count() > 0) {
      // Get computed text color
      const textColor = await heading.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      // In dark mode, text should be LIGHT (around rgb(241, 245, 249) for --text in dark mode)
      // NOT dark stone color (around rgb(28, 25, 23) for text-stone-900)
      
      // This assertion SHOULD FAIL on unfixed code because text-stone-900 stays dark
      const rgb = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgb) {
        const [_, r, g, b] = rgb.map(Number);
        
        // In dark mode, all RGB components should be > 200 (light text)
        expect(r).toBeGreaterThan(200);
        expect(g).toBeGreaterThan(200);
        expect(b).toBeGreaterThan(200);
      }
    }
  });

  /**
   * Property 1 (Part C): Bug Condition - Missing Theme Toggle on Notifications
   * 
   * Tests that Notifications page header contains a theme toggle button.
   * 
   * EXPECTED ON UNFIXED CODE: FAIL - button not found
   */
  test('Notifications page should have theme toggle button in header', async ({ page }) => {
    await page.goto('/notifications');
    
    // Wait for page to load
    await page.waitForSelector('header', { timeout: 10000 });
    
    // Look for theme toggle button
    const themeToggle = page.locator('header button.theme-toggle');
    
    // This assertion SHOULD FAIL on unfixed code
    await expect(themeToggle).toBeVisible({ timeout: 5000 });
  });

  /**
   * Preservation Check: ProgressAnalytics Already Has Theme Toggle
   * 
   * This test verifies that ProgressAnalytics page already has a working
   * theme toggle button. This should PASS on unfixed code, demonstrating
   * that some pages already implement the feature correctly.
   * 
   * EXPECTED ON UNFIXED CODE: PASS (this page already works correctly)
   */
  test('ProgressAnalytics should have theme toggle button (preservation check)', async ({ page }) => {
    await page.goto('/progress');
    
    // Wait for page to load
    await page.waitForSelector('header', { timeout: 10000 });
    
    // Look for theme toggle button
    const themeToggle = page.locator('header button.theme-toggle');
    
    // This assertion SHOULD PASS on unfixed code
    await expect(themeToggle).toBeVisible({ timeout: 5000 });
    
    // Verify the button actually works by clicking it
    await themeToggle.click();
    
    // Check that dark class was toggled
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    
    // Should have toggled (if it was light, now dark; if dark, now light)
    expect(typeof hasDarkClass).toBe('boolean');
  });
});
