from playwright.sync_api import sync_playwright
import os

def run_final_verification(page):
    base_path = os.path.abspath("RPK-main/fleetconnect.html")
    page.goto(f"file://{base_path}")
    page.wait_for_timeout(1000)

    # 1. Verify Restored Sections
    print("Checking restored sections...")
    assert page.locator("#services").is_visible()
    assert page.locator("#contact").is_visible()
    print("Services and Contact sections are present.")

    # 2. Verify AI Widget Presence
    print("Checking AI Widget...")
    assert page.locator("#ai-chat-launcher").is_visible()
    page.locator("#ai-chat-launcher").click()
    page.wait_for_timeout(500)
    assert page.locator("#ai-chat-container").is_visible()
    print("AI Widget functional.")

    # 3. Verify Manual Form Flow
    print("Testing manual form...")
    page.locator("#pickupInput").fill("Ghent")
    page.locator("#dropoffInput").fill("Brussels")
    page.evaluate("document.getElementById('datetimeInput').value = '20-05-2026 10:00'")
    page.locator("#nextBtn").click()
    page.wait_for_timeout(500)

    # Step 2: Vehicle
    assert page.locator("text=Business Class").is_visible()
    page.screenshot(path="/home/jules/verification/screenshots/final_verify_v2.png")
    print("Final verification screenshot saved.")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            run_final_verification(page)
        finally:
            context.close()
            browser.close()
