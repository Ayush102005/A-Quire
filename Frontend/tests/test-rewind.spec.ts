import { test, expect } from '@playwright/test';

test.describe('Video Rewind Bug Reproduction', () => {
  test('rewinding video should not reload the page', async ({ page }) => {
    // 1. Log all console messages and network errors to understand the bug
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser PageError] ${err.message}`));
    page.on('requestfailed', request => console.error(`[Network Error] ${request.url()} failed: ${request.failure()?.errorText}`));
    
    // Log any navigations
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log(`[Navigation] Main frame navigated to ${frame.url()}`);
      }
    });

    // 2. Perform Login
    console.log('Navigating to login...');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign in")');

    // Wait for dashboard
    console.log('Waiting for dashboard...');
    await page.waitForURL('/dashboard');
    console.log('Logged in successfully.');

    // 3. Navigate to a lesson
    console.log('Navigating to lesson 23...');
    await page.goto('/lesson?id=23');
    
    // 4. Wait for player to load
    console.log('Waiting for video player to initialize...');
    await expect(page.locator('.video-card')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // 5. Simulate Rewind multiple times to trigger the struggle threshold
    console.log('Simulating video rewind...');
    
    for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video) {
                video.currentTime = Math.max(0, video.currentTime - 10);
            } else {
                // If YouTube, try to reach the player iframe API
                const iframe = document.querySelector('iframe');
                if (iframe) {
                   console.log('YouTube iframe found, but cross-origin prevents direct seeking. Rewind must be tested manually or mocked.');
                }
            }
        });
        await page.waitForTimeout(1000);
    }

    // Wait and observe
    console.log('Waiting 5 seconds to observe if the page reloads...');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log(`Current URL after rewind test: ${currentUrl}`);
    
    expect(currentUrl).toContain('/lesson');
  });
});
