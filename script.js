let client;
let myName = "";
let myRoom = "";
let mediaRecorder, audioChunks = [], isRecording = false, audioBlobData = null;
let isSoundOn = true;
let sendOnEnter = true;
let replyingTo = null;
let onlineUsers = {};
let typingTimeout;

const notifAudio = document.getElementById('notifSound');

// --- INIT ---
window.onload = function() {
    if(localStorage.getItem('aksara_name')) document.getElementById('username').value = localStorage.getItem('aksara_name');
    if(localStorage.getItem('aksara_room')) document.getElementById('room').value = localStorage.getItem('aksara_room');
    
    if(localStorage.getItem('aksara_sound')) {
        isSoundOn = (localStorage.getItem('aksara_sound') === 'true');
        document.getElementById('sound-toggle').checked = isSoundOn;
    }
    if(localStorage.getItem('aksara_enter')) {
        sendOnEnter = (localStorage.getItem('aksara_enter') === 'true');
        document.getElementById('enter-toggle').checked = sendOnEnter;
    }
    const savedBg = localStorage.getItem('aksara_bg_image');
    if(savedBg) document.body.style.backgroundImage = `url(${savedBg})`;
};

// --- NOTIFIKASI SYSTEM ---
function enableNotif() {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") alert("Notifikasi Aktif!");
        else alert("Ditolak browser.");
    });
}

function sendSystemNotification(user, text) {
    if (document.visibilityState === "hidden" && Notification.permission === "granted") {
        const notif = new Notification(`Aksara: ${user}`, {
            body: text, icon: "https://i.imgur.com/Ct0pzwl.png", vibrate: [200, 100, 200], tag: 'aksara-msg'
        });
        notif.onclick = function() { window.focus(); this.close(); };
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.style.left === '0px') {
        sidebar.style.left = '-280px'; overlay.style.display = 'none';
    } else {
        sidebar.style.left = '0px'; overlay.style.display = 'block';
    }
}

// --- CORE CONNECTION (DIUBAH KE HIVEMQ) ---
function startChat() {
    const user = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim().toLowerCase();
    if (!user || !room) { alert("Isi data dulu!"); return; }

    localStorage.setItem('aksara_name', user);
    localStorage.setItem('aksara_room', room);
    myName = user;
    myRoom = "aksara-v18/" + room; // Versi baru channel

    document.getElementById('side-user').innerText = myName;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('typing-indicator').innerText = "from Amogenz";

    loadChatHistory();

    // Opsi Koneksi Stabil
    const options = { 
        protocol: 'wss', // Wajib WSS untuk HTTPS
        type: 'mqtt',
        clean: true,
        reconnectPeriod: 1000,
        clientId: 'aksara_' + Math.random().toString(16).substr(2, 8)
    };

    // GANTI SERVER KE HIVEMQ (LEBIH STABIL)
    client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', options);

    client.on('connect', () => {
        console.log("Terhubung ke Server");
        client.subscribe(myRoom);
        publishMessage("bergabung.", 'system');
        
        // Heartbeat User Online
        setInterval(() => {
            client.publish(myRoom, JSON.stringify({ type: 'ping', user: myName }));
            cleanOnlineList();
        }, 10000);
    });

    client.on('error', (err) => { console.log("Error:", err); });
    
    client.on('message', (topic, message) => {
        if (topic === myRoom) {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'ping') { updateOnlineList(data.user); return; }
                if (data.type === 'typing') { showTyping(data.user); return; }
                displayMessage(data, true);
            } catch (e) { console.log("Error parse msg"); }
        }
    });
}

// --- UTILS ---
function handleBackgroundUpload(input) {
    const file = input.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                localStorage.setItem('aksara_bg_image', e.target.result);
                document.body.style.backgroundImage = `url(${e.target.result})`;
                alert("Background diganti!");
            } catch (err) { alert("Gambar terlalu besar!"); }
        }
        reader.readAsDataURL(file);
    }
}
function resetBackground() {
    localStorage.removeItem('aksara_bg_image');
    document.body.style.backgroundImage = "";
    alert("Background dihapus.");
}

function getStorageKey() { return 'aksara_chat_history_' + myRoom; }
function saveMessageToHistory(msgData) {
    let history = JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
    history.push(msgData);
    if(history.length > 50) history.shift(); 
    localStorage.setItem(getStorageKey(), JSON.stringify(history));
}
function loadChatHistory() {
    const key = getStorageKey();
    let history = JSON.parse(localStorage.getItem(key) || "[]");
    const chatBox = document.getElementById('messages');
    chatBox.innerHTML = '<div class="welcome-msg">Riwayat chat dimuat.</div>';
    history.forEach(data => displayMessage(data, false));
}
function clearChatHistory() { localStorage.removeItem(getStorageKey()); }

function toggleSound() { isSoundOn = document.getElementById('sound-toggle').checked; localStorage.setItem('aksara_sound', isSoundOn); }
function toggleEnterSettings() { sendOnEnter = document.getElementById('enter-toggle').checked; localStorage.setItem('aksara_enter', sendOnEnter); }

function updateOnlineList(user) { onlineUsers[user] = Date.now(); renderOnlineList(); }
function cleanOnlineList() { const now = Date.now(); for (const user in onlineUsers) { if (now - onlineUsers[user] > 25000) delete onlineUsers[user]; } renderOnlineList(); }
function renderOnlineList() {
    const list = document.getElementById('online-list');
    const count = document.getElementById('online-count');
    list.innerHTML = ""; let total = 0;
    for (const user in onlineUsers) {
        total++; const li = document.createElement('li');
        li.style.color = "#aaa"; li.style.marginBottom = "5px"; li.style.fontSize = "0.9rem"; li.innerHTML = `<span style="color:#0f0">●</span> ${user}`;
        list.appendChild(li);
    }
    count.innerText = total;
}

// --- MESSAGING LOGIC (UNBLOCKED) ---
function publishMessage(content, type = 'text') {
    if (!content) return;
    
    // HAPUS PENGECEKAN isConnected AGAR TIDAK MACET
    // Biarkan library menghandle antrian jika koneksi lambat
    
    const payload = { user: myName, content: content, type: type, reply: replyingTo };
    
    try {
        client.publish(myRoom, JSON.stringify(payload));
    } catch (e) {
        alert("Gagal kirim. Cek internet kamu.");
    }
    
    cancelReply();
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (text) {
        publishMessage(text, 'text');
        input.value = ''; input.style.height = 'auto'; input.focus();
    }
}

// Fix Tombol Enter
function handleEnter(e) { 
    // Cek jika Enter ditekan TANPA Shift
    if (e.key === 'Enter' && !e.shiftKey) {
        if(sendOnEnter) {
            e.preventDefault(); // Cegah baris baru
            sendMessage();
        }
    } 
}

function setReply(user, text) {
    replyingTo = { user: user, text: text };
    document.getElementById('reply-preview-bar').style.display = 'flex';
    document.getElementById('reply-to-user').innerText = user;
    document.getElementById('reply-preview-text').innerText = text;
    document.getElementById('msg-input').focus();
}
function cancelReply() { replyingTo = null; document.getElementById('reply-preview-bar').style.display = 'none'; }

async function toggleRecording() {
    const micBtn = document.getElementById('mic-btn');
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream); audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                audioBlobData = new Blob(audioChunks, { type: 'audio/webm' });
                document.getElementById('vn-player').src = URL.createObjectURL(audioBlobData);
                document.getElementById('vn-preview-bar').style.display = 'flex';
                document.getElementById('main-input-area').style.display = 'none';
            };
            mediaRecorder.start(); isRecording = true; micBtn.classList.add('recording');
        } catch (err) { alert("Butuh izin mic!"); }
    } else { mediaRecorder.stop(); isRecording = false; micBtn.classList.remove('recording'); }
}
function sendVoiceNote() {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlobData); 
    reader.onloadend = () => { publishMessage(reader.result, 'audio'); cancelVoiceNote(); };
}
function cancelVoiceNote() { audioBlobData = null; document.getElementById('vn-preview-bar').style.display = 'none'; document.getElementById('main-input-area').style.display = 'flex'; }

function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image(); img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                const scale = 300 / img.width; canvas.width = 300; canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                publishMessage(canvas.toDataURL('image/jpeg', 0.6), 'image');
            }
        }
        reader.readAsDataURL(file);
    }
    input.value = "";
}

function handleTyping() {
    if(client && client.connected) client.publish(myRoom, JSON.stringify({ type: 'typing', user: myName }));
    const el = document.getElementById('msg-input'); el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px';
}
function showTyping(user) {
    if (user === myName) return;
    const ind = document.getElementById('typing-indicator');
    ind.innerText = `${user} mengetik...`; ind.style.color = "#FFD700";
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { ind.innerText = "from Amogenz"; ind.style.color = "#888"; }, 2000);
}

function displayMessage(data, saveToStorage = false) {
    const chatBox = document.getElementById('messages');
    const div = document.createElement('div');
    const isMe = data.user === myName;

    if(saveToStorage && data.type !== 'system') saveMessageToHistory(data);

    if (!isMe && data.type !== 'system' && saveToStorage) {
        if (isSoundOn) {
            notifAudio.currentTime = 0;
            notifAudio.play().catch(() => {});
        }
        sendSystemNotification(data.user, data.type === 'text' ? data.content : 'Mengirim media');
    }

    if (data.type === 'system') {
        div.style.textAlign = 'center'; div.style.fontSize = '0.75rem'; 
        div.style.color = '#888'; div.style.margin = "10px 0";
        div.innerText = `${data.user} ${data.content}`;
    } else {
        div.className = isMe ? 'message right' : 'message left';
        let contentHtml = "";
        let plainText = "Media";
        if (data.type === 'text') { contentHtml = `<span>${data.content}</span>`; plainText = data.content; }
        else if (data.type === 'image') contentHtml = `<img src="${data.content}" class="chat-image">`;
        else if (data.type === 'audio') contentHtml = `<audio controls src="${data.content}"></audio>`;

        let replyHtml = "";
        if(data.reply) {
            replyHtml = `<div class="reply-quote">
                <b>${data.reply.user}</b><br>${data.reply.text}
            </div>`;
        }
        const replyBtn = !isMe ? `<span onclick="setReply('${data.user}', '${plainText.replace(/'/g,"\\'")}')" style="cursor:pointer; margin-left:8px;">↩</span>` : '';

        div.innerHTML = `
            ${replyHtml}
            <span class="sender-name">${data.user}</span>
            <div style="display:block;">
                ${contentHtml}
                <span style="float:right; margin-left:5px; margin-top:5px;">${replyBtn}</span>
            </div>
        `;
    }
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function leaveRoom() {
    if(confirm("Keluar & Hapus Chat?")) {
        if(client && client.connected) publishMessage("telah keluar.", 'system');
        clearChatHistory();
        localStorage.removeItem('aksara_name');
        localStorage.removeItem('aksara_room');
        location.reload();
    }
}
