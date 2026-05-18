import asyncio
from playwright.async_api import async_playwright
import os
import json

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        # Mock the AI response to test the UI flow without a backend
        await page.route("**/api/ai-chat", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "reply": "Natuurlijk, ik help u graag. Ik heb een boeking aangemaakt met referentie PK-123456. Hier zijn de details van uw rit van Brussel naar Antwerpen.",
                "intent": "booking",
                "missing_fields": [],
                "pickup": "Brussel",
                "destination": "Antwerpen",
                "date": "20-05-2024",
                "time": "12:00",
                "vehicle": "Business Class",
                "name": "Jan Janssen",
                "payment_method": "Card",
                "extras": ["Water"],
                "language": "nl"
            })
        ))

        url = "http://localhost:8000/RPK-main/fleetconnect.html"

        print(f"Opening {url}")
        await page.goto(url)
        await asyncio.sleep(2)

        # Open chat
        print("Opening chat...")
        launcher = await page.wait_for_selector("#ai-chat-launcher", state="visible")
        await launcher.click()

        # Wait for container to be active
        print("Waiting for chat container to be active...")
        await page.wait_for_selector("#ai-chat-container.active", state="visible")
        await asyncio.sleep(1) # Wait for animation
        await page.screenshot(path="verification/chat_opened_v4.png")

        # Send a message in Dutch
        print("Sending Dutch message...")
        input_field = await page.wait_for_selector("#ai-chat-input", state="visible")
        await input_field.fill("Ik wil een rit boeken van Brussel naar Antwerpen morgen om 12:00")
        await page.keyboard.press("Enter")

        print("Waiting for AI response and card...")
        # Wait for the chat bubble with the card
        await page.wait_for_selector(".booking-card", state="visible", timeout=15000)
        await asyncio.sleep(2) # Wait for cards to settle
        await page.screenshot(path="verification/chat_interaction_card_v4.png")

        # Check if "K2000" is present
        content = await page.content()
        if "K2000" in content:
            print("SUCCESS: K2000 found in page")
        else:
            print("FAILURE: K2000 NOT found in page")

        # Check for European date format in the card
        if "20-05-2024" in content:
            print("SUCCESS: European date format found in card")
        else:
            print("FAILURE: European date format NOT found in card")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
