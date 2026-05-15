import os
import re

WIDGET_HTML = """
    <!-- PREMIUM AI CHAT WIDGET (K2000) -->
    <script src="booking-logic.js"></script>
    <style>
        #ai-chat-launcher {
            position: fixed; bottom: 30px; right: 30px;
            width: 70px; height: 70px; background: #2c7da0;
            color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            cursor: pointer; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #ai-chat-launcher i { font-size: 30px; }
        #ai-chat-launcher::after {
            content: "K2000 — Driving Assistant";
            position: absolute; right: 85px; background: white; color: #1a2a3a;
            padding: 12px 20px; border-radius: 25px; font-weight: 600; font-size: 0.9rem;
            white-space: nowrap; box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            border: 1px solid #2c7da0; pointer-events: none;
            opacity: 1;
        }
        #ai-chat-launcher:hover { transform: scale(1.1); }
        #ai-chat-container {
            position: fixed; bottom: 110px; right: 30px;
            width: 450px; max-width: calc(100vw - 60px); height: 700px; max-height: calc(100vh - 160px);
            background: white; border-radius: 30px; box-shadow: 0 25px 60px rgba(0,0,0,0.2);
            z-index: 10001; display: flex; flex-direction: column; overflow: hidden;
            transform: translateY(30px) scale(0.9); opacity: 0; visibility: hidden;
            transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #ai-chat-container.active { transform: translateY(0) scale(1); opacity: 1; visibility: visible; }
        .ai-header { background: #1a2a3a; color: white; padding: 25px; display: flex; justify-content: space-between; align-items: center; }
        .ai-header .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; }
        .ai-header .close { cursor: pointer; }
        #ai-messages { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; background: #f9fbff; }
        .msg { max-width: 85%; padding: 15px 20px; border-radius: 20px; font-size: 0.95rem; line-height: 1.5; }
        .msg.ai { align-self: flex-start; background: white; border: 1px solid #eee; }
        .msg.user { align-self: flex-end; background: #2c7da0; color: white; }
        .ai-input-area { padding: 20px 25px; border-top: 1px solid #eee; background: white; }
        .input-wrap { background: #f1f5f9; border-radius: 30px; display: flex; padding: 5px 20px; align-items: center; }
        #ai-input { flex: 1; border: none; background: none; padding: 10px 0; outline: none; }
        #ai-send { background: #2c7da0; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; }
    </style>
    <div id="ai-chat-launcher"><i class="fas fa-robot"></i></div>
    <div id="ai-chat-container">
        <div class="ai-header"><div class="brand">K2000 — Driving Assistant</div><div class="close" id="close-ai">&times;</div></div>
        <div id="ai-messages"><div class="msg ai">Welcome. I am K2000. How may I assist you?</div></div>
        <div class="ai-input-area"><div class="input-wrap"><input type="text" id="ai-input" placeholder="Type message..."><button id="ai-send">></button></div></div>
    </div>
    <script>
        (function() {
            const l = document.getElementById('ai-chat-launcher');
            const c = document.getElementById('ai-chat-container');
            const i = document.getElementById('ai-input');
            const m = document.getElementById('ai-messages');
            let h = [];
            l.onclick = () => { c.classList.add('active'); l.style.display='none'; };
            document.getElementById('close-ai').onclick = () => { c.classList.remove('active'); l.style.display='flex'; };
            async function send() {
                const text = i.value.trim(); if(!text) return;
                const u = document.createElement('div'); u.className='msg user'; u.innerText=text; m.appendChild(u);
                i.value=''; h.push({role:'user',content:text});
                const res = await fetch('/api/ai-chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:text, conversationHistory:h})});
                const d = await res.json();
                const a = document.createElement('div'); a.className='msg ai'; a.innerText=d.reply; m.appendChild(a);
                h.push({role:'assistant',content:JSON.stringify(d)});
                m.scrollTop = m.scrollHeight;
            }
            document.getElementById('ai-send').onclick = send;
            i.onkeypress = (e) => { if(e.key==='Enter') send(); };
        })();
    </script>
"""

TARGET_FILES = ["PV.html", "Horizon.html", "bravo.html"]

def inject():
    for filename in TARGET_FILES:
        path = os.path.join("RPK-main", filename)
        if not os.path.exists(path):
            continue

        with open(path, "r") as f:
            content = f.read()

        if "ai-chat-launcher" in content:
            print(f"Skipping {filename}, already has widget.")
            continue

        # Inject before </body>
        new_content = content.replace("</body>", WIDGET_HTML + "\n</body>")

        with open(path, "w") as f:
            f.write(new_content)
        print(f"Injected widget into {filename}")

if __name__ == "__main__":
    inject()
