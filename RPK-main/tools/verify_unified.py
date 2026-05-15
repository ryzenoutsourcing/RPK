from playwright.sync_api import sync_playwright
import os

def run_verification(page):
    # Navigate to the main page
    base_path = os.path.abspath("RPK-main/fleetconnect.html")
    page.goto(f"file://{base_path}")
    page.wait_for_timeout(1000)

    # 1. Verify Branding
    print("Verifying branding...")
    launcher = page.locator("#ai-chat-launcher")
    page.wait_for_selector("#ai-chat-launcher")

    # 2. Open AI Chat
    print("Opening AI Chat...")
    launcher.click()
    page.wait_for_timeout(1000)

    # 3. Verify K2000 Name
    header_text = page.locator(".ai-header .brand span").inner_text()
    print(f"Header: {header_text}")

    # 4. Interact with AI (Simulated/Typing)
    print("Typing in AI chat...")
    page.locator("#ai-input").fill("Hello, I need a ride")
    page.wait_for_timeout(500)
    page.screenshot(path="/home/jules/verification/screenshots/ai_chat_open.png")

    # 5. Manual Form - Fill what we can
    print("Navigating manual form...")
    page.locator("#pickupInput").fill("Gent")
    page.locator("#dropoffInput").fill("Brussel")
    # Datetime is readonly due to flatpickr, so we use evaluate
    page.evaluate("document.getElementById('datetimeInput').value = '20-05-2026 10:00'")
    page.wait_for_timeout(500)

    # Click Next
    page.locator("#nextBtn").click()
    page.wait_for_timeout(1000)

    # Now in Step 2: Vehicle
    print("In Vehicle selection step...")
    # Scroll to top of form to see vehicle grid
    page.evaluate("document.getElementById('booking-anchor').scrollIntoView()")
    page.wait_for_timeout(500)
    page.screenshot(path="/home/jules/verification/screenshots/manual_form_step2.png")

    # Select First Class
    page.locator("text=First Class Executive").click()
    page.wait_for_timeout(500)

    print("Verification complete.")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/videos")
        page = context.new_page()
        try:
            run_verification(page)
        finally:
            context.close()
            browser.close()
