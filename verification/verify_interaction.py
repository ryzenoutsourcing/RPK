import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # We need a server running or use file://
        # Since the previous script used http://localhost:8001, I assume it's running or can be started.
        # I'll use file path to be safe if server isn't running.
        abs_path = os.path.abspath("RPK-main/fleetconnect.html")
        url = f"file://{abs_path}"

        print(f"Opening {url}")
        await page.goto(url)
        await asyncio.sleep(2)

        # Open chat
        print("Opening chat...")
        launcher = await page.query_selector("#ai-chat-launcher")
        if launcher:
            await launcher.click()
            await asyncio.sleep(1)
            await page.screenshot(path="verification/chat_opened.png")

            # Send a message
            print("Sending message...")
            textarea = await page.query_selector(".chat-input textarea")
            if textarea:
                await textarea.fill("I want to book a trip from Brussels Airport to Ghent tomorrow at 10:00")
                await page.keyboard.press("Enter")

                # Wait for AI response (up to 10 seconds)
                print("Waiting for AI response...")
                await asyncio.sleep(8)
                await page.screenshot(path="verification/ai_response.png")

                # Look for vehicle selection or confirmation card
                await page.screenshot(path="verification/ai_interaction_full.png", full_page=True)
            else:
                print("Textarea not found")
        else:
            print("Launcher not found")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
