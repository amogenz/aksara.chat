/* --- GLOBAL & RESET --- */
* { 
    box-sizing: border-box; 
    -webkit-tap-highlight-color: transparent; 
}

body { 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0; 
    background-color: #121212;
    background-image: radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%);
    color: #E0E0E0; 
    height: 100vh;
    height: 100dvh; /* Fix untuk browser HP */
    overflow: hidden; 
}

/* Pastikan Input File Benar-benar Hilang */
#file-input {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    position: absolute;
    z-index: -9999;
}

/* --- CUSTOM SCROLLBAR --- */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #1A1A1A; }
::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #FFD700; }

/* --- LOGIN SCREEN --- */
#login-screen { 
    display: flex; height: 100%; align-items: center; justify-content: center; 
    flex-direction: column; background: #121212; padding: 20px; 
    position: absolute; top: 0; left: 0; width: 100%; z-index: 999;
}
.login-box { 
    background: #1E1E1E; padding: 30px; border-radius: 20px; 
    width: 100%; max-width: 320px; text-align: center; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #333;
}
.login-box h2 { margin:0 0 5px 0; color: #FFD700; letter-spacing: 1px; }
.login-box input { 
    width: 100%; padding: 15px; margin: 10px 0; 
    border: 2px solid #333; border-radius: 12px; outline: none; 
    background: #2C2C2C; color: #fff; font-size: 1rem; transition: 0.3s;
}
.login-box input:focus { border-color: #FFD700; background: #333; }
.btn-start { 
    width: 100%; padding: 15px; background: linear-gradient(45deg, #FFD700, #FFA500); 
    color: #121212; border: none; border-radius: 12px; cursor: pointer; 
    font-weight: 800; margin-top: 15px; font-size: 1rem; letter-spacing: 1px;
    transition: transform 0.1s;
}
.btn-start:active { transform: scale(0.98); }

/* --- SIDEBAR --- */
#sidebar-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8); z-index: 998; display: none; backdrop-filter: blur(3px);
}
#sidebar {
    position: fixed; top: 0; left: -300px; width: 280px; height: 100%;
    background: #1E1E1E; z-index: 999; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: 1px solid #333; padding: 25px; display: flex; flex-direction: column;
    box-shadow: 5px 0 25px rgba(0,0,0,0.5);
}
#sidebar.active { left: 0; }
.sidebar-header { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #333; }

.permission-btn {
    width: 100%; padding: 12px; background: #2C2C2C; border: 1px solid #444;
    color: white; border-radius: 8px; cursor: pointer; margin-top: 10px; text-align: left;
    transition: 0.2s;
}
.permission-btn:active { background: #444; transform: scale(0.98); }

.sidebar-btn {
    background: transparent; color: #ff4444; border: 1px solid #ff4444;
    padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;
    margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: 0.2s;
}
.sidebar-btn:active { background: rgba(255, 68, 68, 0.1); }

/* --- CHAT HEADER (Fix Layout Sejajar) --- */
#chat-screen { display: none; flex-direction: column; height: 100%; width: 100%; }

header { 
    background: rgba(30, 30, 30, 0.95); backdrop-filter: blur(10px);
    color: #E0E0E0; padding: 0 15px; 
    display: flex; align-items: center; justify-content: space-between;
    position: fixed; top: 0; left: 0; width: 100%; z-index: 10;
    height: 60px; border-bottom: 1px solid #333; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.header-left { 
    display: flex; 
    align-items: center; 
    gap: 12px; /* Jarak antar elemen */
    width: 100%;
}

.header-logo { width: 38px; height: 38px; border-radius: 50%; border: 2px solid #FFD700; }
.header-title-text { font-size: 18px; font-weight: 700; color: #E0E0E0; }

/* Badge Room Sebelah Judul */
.room-badge {
    background: rgba(255, 215, 0, 0.15);
    color: #FFD700;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85rem;
    border: 1px solid rgba(255, 215, 0, 0.3);
    margin-left: 5px; /* Jarak dikit dari judul */
}

.hamburger-icon { display: flex; flex-direction: column; justify-content: center; gap: 6px; width: 30px; height: 30px; cursor: pointer; padding: 5px; }
.hamburger-icon span { display: block; width: 100%; height: 3px; background: #FFD700; border-radius: 3px; }

/* --- MESSAGES AREA --- */
#messages { 
    flex: 1; overflow-y: auto; padding: 20px 15px; 
    padding-top: 80px; padding-bottom: 140px; 
    display: flex; flex-direction: column; gap: 8px; 
}
.welcome-msg { 
    text-align: center; color: #888; font-size: 0.8rem; 
    background: #1e1e1e; align-self: center; padding: 10px 20px; 
    border-radius: 20px; margin-bottom: 20px; border: 1px solid #333;
}

.message { 
    max-width: 85%; padding: 10px 14px; 
    font-size: 0.95rem; position: relative; 
    display: flex; flex-direction: column;
    box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    animation: slideUp 0.2s ease-out forwards; 
    opacity: 0; transform: translateY(10px);
    white-space: pre-wrap; 
    word-wrap: break-word;
    word-break: break-word;
}

@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

.message.left { 
    align-self: flex-start; 
    background: #2C2C2C; 
    color: #fff; 
    border-radius: 18px 18px 18px 4px; 
    margin-left: 5px; 
}
.message.right { 
    align-self: flex-end; 
    background: #FFD700; 
    color: #000; 
    border-radius: 18px 18px 4px 18px; 
    margin-right: 5px; 
}
.message.right .time-info { color: rgba(0,0,0,0.6); }
.sender-name { font-size: 0.75rem; margin-bottom: 4px; font-weight: bold; color: #FFD700; }
.time-info { font-size: 0.65rem; margin-top: 4px; align-self: flex-end; opacity: 0.7; }

/* --- FOOTER & INPUT --- */
.footer-container {
    position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%);
    width: 95%; max-width: 600px; z-index: 20;
    display: flex; flex-direction: column; gap: 5px;
}

#reply-preview-bar, #vn-preview-bar {
    background: #252525; padding: 10px 15px; border-radius: 15px;
    display: none; align-items: center; justify-content: space-between;
    border-left: 4px solid #FFD700; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
#reply-preview-text { color: #aaa; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.input-area { 
    background: #1E1E1E; padding: 8px 12px; border-radius: 25px;
    display: flex; align-items: flex-end; 
    gap: 8px; box-shadow: 0 5px 20px rgba(0,0,0,0.4); border: 1px solid #333;
    transition: border 0.3s;
}
.input-area:focus-within { border-color: #555; }

.input-wrapper { flex: 1; display: flex; align-items: center; min-height: 40px; }

#msg-input { 
    width: 100%; padding: 10px 5px; border: none; background: transparent; 
    color: #fff; outline: none; font-size: 1rem; 
    resize: none; 
    font-family: inherit; max-height: 120px; overflow-y: auto;
    line-height: 1.4;
}

.icon-btn { background: none; border: none; color: #888; padding: 10px; cursor: pointer; transition: 0.2s; }
.icon-btn:hover { color: #FFD700; }
.icon-btn svg { width: 24px; height: 24px; fill: currentColor; }

#send-btn {
    background: #FFD700; border: none; width: 42px; height: 42px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    color: #000; margin-bottom: 2px; flex-shrink: 0;
    transition: transform 0.1s;
}
#send-btn:active { transform: scale(0.9); }
#send-btn svg { width: 20px; height: 20px; fill: currentColor; margin-left: 3px; }

/* --- EXTRAS --- */
.chat-image { width: 100%; border-radius: 12px; margin-top: 5px; max-width: 250px; object-fit: cover; }
#typing-indicator { position: fixed; bottom: 85px; left: 20px; font-size: 0.75rem; color: #FFD700; font-style: italic; opacity: 0; transition: 0.3s; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.recording { color: #ff4444 !important; animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

/* Switch Toggle UI */
.switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #444; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #FFD700; }
input:checked + .slider:before { transform: translateX(18px); }
.setting-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 0.9rem; }

.close-prev { padding: 10px; font-weight: bold; cursor: pointer; color: #888; }
.vn-actions { display: flex; gap: 10px; }
.btn-circle { width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.btn-circle.green { background: #4CAF50; color: white; }
.btn-circle.red { background: #F44336; color: white; }
