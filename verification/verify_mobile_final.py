import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # iPhone 12 viewport
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
        )
        page = await context.new_page()

        # Start local server
        url = "http://localhost:8000/RPK-main/fleetconnect.html"

        try:
            await page.goto(url)
            await page.wait_for_timeout(2000) # Wait for animations

            # Screenshot of the bubble
            await page.screenshot(path='verification/mobile_footer_check.png')

            # Click the bubble
            await page.click('#chat-widget-bubble')
            await page.wait_for_timeout(1000)

            # Screenshot of the open chat on mobile
            await page.screenshot(path='verification/mobile_chat_open.png')

            print("Mobile screenshots saved.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
