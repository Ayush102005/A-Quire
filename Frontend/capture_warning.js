import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    permissions: ['camera', 'microphone']
  });
  const page = await context.newPage();
  
  let stackTrace = null;
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[gaze-warning-stack]')) {
      console.log('--- FOUND WARNING STACK ---');
      stackTrace = text;
    } else if (text.includes('[gaze-react-update]')) {
      console.log('Trace Update:', text);
    }
  });

  try {
    console.log('Navigating...');
    await page.goto('http://localhost:5173/lesson?id=9&course_id=5', { waitUntil: 'networkidle' });
    
    // Check if we need to login
    const isLogin = await page.$('input[type="email"]');
    if (isLogin) {
      console.log('Found login form, waiting for manual trigger in browser? No, I will sign in');
      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input[type="password"]', 'test');
      await page.click('button:has-text("Sign In"), button:has-text("Demo Student")');
      await page.waitForNavigation();
      await page.goto('http://localhost:5173/lesson?id=9&course_id=5');
    }

    console.log('Clicking Enable focus tracking...');
    await page.click('button:has-text("Enable focus tracking"), button:has-text("Allow camera access")').catch(() => {});
    
    // If modal is there
    await page.click('button:has-text("Allow camera access")').catch(() => {});
    
    // Wait for "Calibrate" button
    await page.waitForTimeout(2000);
    console.log('Clicking Calibrate...');
    await page.click('button:has-text("Calibrate"), button:has-text("Start Calibration")').catch(() => {});

    await page.waitForTimeout(2000);
    console.log('Clicking Start...');
    await page.click('button:has-text("Start")').catch(() => {});

    // Wait for calibration dots
    await page.waitForTimeout(6000);
    
    if (stackTrace) {
      console.log('\n===== EXTRACTED STACK TRACE =====\n' + stackTrace);
    } else {
      console.log('\nNo warning stack trace captured.');
    }
  } catch (e) {
    console.error('Script Error:', e);
  } finally {
    await browser.close();
  }
})();
