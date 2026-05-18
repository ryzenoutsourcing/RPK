import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Test Fleetconnect
        print("Testing Fleetconnect...")
        await page.goto("http://localhost:8001/fleetconnect.html")
        await asyncio.sleep(2)
        await page.screenshot(path="verification/fleetconnect_home.png")

        # Check welcome bubble
        bubble = await page.query_selector("#ai-welcome-bubble")
        if bubble:
            print("Welcome bubble found on Fleetconnect")
            await page.screenshot(path="verification/fleetconnect_bubble.png")

        # Open chat
        await page.click("#ai-chat-launcher")
        await asyncio.sleep(1)
        await page.screenshot(path="verification/fleetconnect_chat_open.png")

        # Test Mobile view
        await page.set_viewport_size({"width": 375, "height": 812})
        await asyncio.sleep(1)
        await page.screenshot(path="verification/fleetconnect_mobile.png")

        # Test PV.html
        print("Testing PV.html...")
        await page.set_viewport_size({"width": 1280, "height": 800})
        await page.goto("http://localhost:8001/PV.html")
        await asyncio.sleep(2)
        await page.screenshot(path="verification/pv_home.png")

        # Check if booking logic is used (check a price field)
        await page.click("#ai-chat-launcher")
        await asyncio.sleep(1)
        await page.screenshot(path="verification/pv_chat_open.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
