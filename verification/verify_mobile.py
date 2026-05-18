import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def verify_mobile():
    # Start local server
    server_process = subprocess.Popen(["python3", "-m", "http.server", "8000"])
    time.sleep(2)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            # iPhone 12 viewport
            context = await browser.new_context(
                viewport={'width': 390, 'height': 844},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"
            )
            page = await context.new_page()

            for page_name in ["fleetconnect.html", "PV.html"]:
                url = f"http://localhost:8000/RPK-main/{page_name}"
                print(f"Checking {url} on mobile...")
                await page.goto(url)
                await asyncio.sleep(2)

                # Check if launcher is visible
                launcher = await page.wait_for_selector("#ai-chat-launcher", state="visible")
                await page.screenshot(path=f"/home/jules/verification/screenshots/mobile_{page_name}_launcher.png")

                # Click launcher
                await launcher.click()
                await asyncio.sleep(1)

                # Check if container is active and takes full width
                container = await page.wait_for_selector("#ai-chat-container.active", state="visible")
                await page.screenshot(path=f"/home/jules/verification/screenshots/mobile_{page_name}_chat.png")

                print(f"Mobile check for {page_name} complete.")

            await browser.close()
    finally:
        server_process.terminate()

if __name__ == "__main__":
    asyncio.run(verify_mobile())
