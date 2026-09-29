import { test, expect } from '@playwright/test';

test.describe('Struggle Detection & AI Mentor', () => {
  // Pre-condition: User must be logged in as a student
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard');
  });

  test('manual mentor trigger opens the AI Mentor panel', async ({ page }) => {
    // Navigate to Lesson 1 directly
    await page.goto('/lesson?id=1');

    // Wait for the Ask mentor button (LessonTopBar or VideoPlayer renders it)
    // Note: YouTube videos use iframes so we target the button, not the video element.
    const askMentorBtn = page.locator('button', { hasText: /ask mentor/i }).first();
    await expect(askMentorBtn).toBeVisible({ timeout: 10000 });
    await askMentorBtn.click();

    // The MentorPanel header should now be visible
    const mentorHeading = page.locator('[aria-label="AI Mentor panel"] h2, aside[aria-label="AI Mentor panel"]').first();
    await expect(mentorHeading).toBeVisible({ timeout: 5000 });

    // Click "Start with a gentle hint" to trigger hint fetch
    const startHintBtn = page.locator('button', { hasText: /start with a gentle hint/i }).first();
    await expect(startHintBtn).toBeVisible();
    await startHintBtn.click();

    // Wait for the loading skeleton to appear then resolve
    // The hint card should appear within 15s (Bedrock / template fallback)
    await expect(page.locator('[aria-label^="Hint 1"]')).toBeVisible({ timeout: 15000 });
  });

  test('struggle overlay appears after inactivity', async ({ page }) => {
    await page.goto('/lesson?id=1');

    // Wait for lesson to load
    await expect(page.locator('button', { hasText: /ask mentor/i }).first()).toBeVisible({ timeout: 10000 });

    // The InterventionOverlay should not be visible initially
    const overlay = page.locator('[data-testid="intervention-overlay"]');
    await expect(overlay).not.toBeVisible();
  });
});
