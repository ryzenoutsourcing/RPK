const { chromium } = require('playwright');
const path = require('path');

async function verify() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const page = await context.newPage();

  const filePath = 'file://' + path.resolve('RPK-main/fleetconnect.html');
  await page.goto(filePath);

  // Wait for chat widget
  await page.waitForSelector('.chat-widget-container');

  // Take screenshot of the bottom area
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: 'verification/mobile_bottom.png' });

  // Open chat
  await page.click('.chat-widget-button');
  await page.waitForSelector('.chat-window.active');
  await page.screenshot({ path: 'verification/mobile_chat_open.png' });

  // Try to send a message
  await page.fill('.chat-input textarea', 'Hello');
  await page.keyboard.press('Enter');

  // Wait a bit for AI response
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/mobile_chat_response.png' });

  await browser.close();
}

verify().catch(console.error);
