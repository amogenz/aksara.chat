let client;
let myName = "";
let myRoom = "";
let storageTopic = ""; 

// --- COUNTER & STATS ---
let statsTopic = "aksara-global-v1/visits"; 
let hasCountedVisit = false; 

let mediaRecorder, audioChunks = [], isRecording = false, audioBlobData = null;
let isSoundOn = true;
let sendOnEnter = true;
let replyingTo = null; // Format: { id, user, text }
let onlineUsers = {};
let typingTimeout;
let localChatHistory = []; 

const notifAudio = document.getElementById('notifSound');

// --- INIT ---
window.onload = function() {
    if(localStorage.getItem('aksara_name')) document.getElementById('username').value = localStorage.getItem('aksara_name');
    if(localStorage.getItem('aksara_room')) document.getElementById('room').value = localStorage.getItem('aksara_room');
    
    if(localStorage.getItem('aksara_sound')) document.getElementById('sound-toggle').checked = (localStorage.getItem('aksara_sound') === 'true');
    if(localStorage.getItem('aksara_enter')) document.getElementById('enter-toggle').checked = (localStorage.getItem('aksara_enter') === 'true');
    const savedBg = localStorage.getItem('aksara_bg_image');
    if(savedBg) document.body.style.backgroundImage = `url(${savedBg})`;
};

// --- NOTIFIKASI SYSTEM ---
function enableNotif() {
    Notification.requestPermission().then(p => {
        if (p === "granted") alert("Notifikasi Aktif!"); else alert("Ditolak browser.");
    });
}
function sendSystemNotification(user, text) {
    if (document.visibilityState === "hidden" && Notification.permission === "granted") {
        const notif = new Notification(`Aksara: ${user}`, { body: text, icon: "https://i.imgur.com/Ct0pzwl.png" });
        notif.onclick = function() { window.focus(); this.close(); };
    }
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.style.left === '0px') { sidebar.style.left = '-280px'; overlay.style.display = 'none'; }
    else { sidebar.style.left = '0px'; overlay.style.display = 'block'; }
}

// --- KONEKSI UTAMA ---
function startChat() {
    const user = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim().toLowerCase();
    if (!user || !room) { alert("Isi data dulu!"); return; }

    localStorage.setItem('aksara_name', user);
    localStorage.setItem('aksara_room', room);
    myName = user;
    myRoom = "aksara-v29/" + room; 
    storageTopic = myRoom + "/storage"; 

    document.getElementById('side-user').innerText = myName;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('room-display').innerText = "#" + room;
    document.getElementById('typing-indicator').innerText = "Menghubungkan...";

    loadFromLocal(); 

    const options = { 
        protocol: 'wss', type: 'mqtt', clean: true, reconnectPeriod: 1000, 
        clientId: 'aks_' + Math.random().toString(16).substr(2, 8) 
    };
    
    client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', options);

    client.on('connect', () => {
        document.getElementById('typing-indicator').innerText = "from Amogenz";
        
        client.subscribe(myRoom);
        client.subscribe(storageTopic);
        client.subscribe(statsTopic);
        
        publishMessage("bergabung.", 'system');
        
        // --- FIX LOADING COUNTER ---
        // Jika dalam 3 detik tidak ada balasan dari topik stats, anggap topik kosong dan mulai dari 1
        setTimeout(() => {
            const counterEl = document.getElementById('visit-counter');
            if (counterEl.innerText === "loading...") {
                counterEl.innerText = "1";
                hasCountedVisit = true;
                client.publish(statsTopic, "1", { retain: true, qos: 1 });
            }
        }, 3000);

        setInterval(() => {
            client.publish(myRoom, JSON.stringify({ type: 'ping', user: myName }));
            cleanOnlineList();
        }, 10000);
    });

    client.on('message', (topic, message) => {
        const msgString = message.toString();
        
        // --- LOGIKA COUNTER ---
        if (topic === statsTopic) {
            let currentVisits = 0;
            try { currentVisits = parseInt(msgString); } catch(e) {}
            if (isNaN(currentVisits)) currentVisits = 0;

            if (!hasCountedVisit) {
                const newVisitCount = currentVisits + 1;
                hasCountedVisit = true; 
                client.publish(statsTopic, newVisitCount.toString(), { retain: true, qos: 1 });
                document.getElementById('visit-counter').innerText = newVisitCount.toLocaleString();
            } else {
                document.getElementById('visit-counter').innerText = currentVisits.toLocaleString();
            }
            return; 
        }

        if (topic === storageTopic) {
            try {
                const serverHistory = JSON.parse(msgString);
                if (Array.isArray(serverHistory)) mergeWithLocal(serverHistory);
            } catch(e) {}
            return;
        }

        if (topic === myRoom) {
            try {
                const data = JSON.parse(msgString);
                if (data.type === 'ping') { updateOnlineList(data.user); return; }
                if (data.type === 'typing') { showTyping(data.user); return; }
                handleIncomingMessage(data);
            } catch (e) {}
        }
    });
}

// --- LOGIKA PENYIMPANAN ---
function loadFromLocal() {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) { localChatHistory = JSON.parse(saved); renderChat(); }
}
function saveToLocal() {
    localStorage.setItem(getStorageKey(), JSON.stringify(localChatHistory));
}
function handleIncomingMessage(data) {
    if(data.type !== 'system') {
        // Cek duplikat via Message ID (lebih akurat) atau Timestamp+User
        const exists = localChatHistory.some(msg => msg.id === data.id);
        if (!exists) {
            localChatHistory.push(data);
            if (localChatHistory.length > 77) localChatHistory = localChatHistory.slice(-77); 
            saveToLocal(); renderChat(); 
            if (data.user === myName) updateServerStorage();
        }
    } else { displaySingleMessage(data); }
}
function mergeWithLocal(serverData) {
    let isChanged = false;
    serverData.forEach(srvMsg => {
        const exists = localChatHistory.some(locMsg => locMsg.id === srvMsg.id);
        if (!exists) { localChatHistory.push(srvMsg); isChanged = true; }
    });
    if (isChanged) {
        localChatHistory.sort((a, b) => a.timestamp - b.timestamp);
        if (localChatHistory.length > 77) localChatHistory = localChatHistory.slice(-77);
        saveToLocal(); renderChat();
    }
}
function updateServerStorage() {
    client.publish(storageTopic, JSON.stringify(localChatHistory), { retain: true, qos: 1 });
}
function renderChat() {
    const chatBox = document.getElementById('messages');
    chatBox.innerHTML = '<div class="welcome-msg">Riwayat chat dimuat (Maks 77).</div>';
    localChatHistory.forEach(msg => displaySingleMessage(msg));
    setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 50);
}

// --- HELPER ---
function getStorageKey() { return 'aksara_history_v29_' + myRoom; }
function handleBackgroundUpload(input) { /* Sama seperti sebelumnya */
    const file = input.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try { localStorage.setItem('aksara_bg_image', e.target.result); document.body.style.backgroundImage = `url(${e.target.result})`; alert("Background diganti!"); } catch(e){alert("Gambar kebesaran!");}
        }
        reader.readAsDataURL(file);
    }
}
function resetBackground() { localStorage.removeItem('aksara_bg_image'); document.body.style.backgroundImage = ""; alert("Background dihapus."); }
function clearChatHistory() { localStorage.removeItem(getStorageKey()); }
function toggleSound() { isSoundOn = document.getElementById('sound-toggle').checked; localStorage.setItem('aksara_sound', isSoundOn); }
function toggleEnterSettings() { sendOnEnter = document.getElementById('enter-toggle').checked; localStorage.setItem('aksara_enter', sendOnEnter); }
function updateOnlineList(user) { onlineUsers[user] = Date.now(); renderOnlineList(); }
function cleanOnlineList() { const now = Date.now(); for (const user in onlineUsers) { if (now - onlineUsers[user] > 25000) delete onlineUsers[user]; } renderOnlineList(); }
function renderOnlineList() {
    const list = document.getElementById('online-list');
    list.innerHTML = ""; let total = 0;
    for (const user in onlineUsers) {
        total++; const li = document.createElement('li');
        li.style.color = "#aaa"; li.style.marginBottom = "5px"; li.style.fontSize = "0.9rem"; li.innerHTML = `<span style="color:#0f0">●</span> ${user}`;
        list.appendChild(li);
    }
    document.getElementById('online-count').innerText = total;
}

// --- SEND MESSAGE ---
function publishMessage(content, type = 'text', caption = '') {
    if (!content) return;
    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    
    // Generate Unique ID
    const msgId = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const payload = { 
        id: msgId, // ID unik untuk scroll
        user: myName, content: content, type: type, 
        caption: caption, time: time, reply: replyingTo, timestamp: Date.now() 
    };
    
    try { client.publish(myRoom, JSON.stringify(payload)); } catch(e) { alert("Koneksi error, coba lagi!"); }
    cancelReply();
}
function sendMessage() {
    const input = document.getElementById('msg-input'); const text = input.value.trim();
    if (text) { publishMessage(text, 'text'); input.value = ''; input.style.height = 'auto'; input.focus(); }
}
function handleEnter(e) { if (e.key === 'Enter' && !e.shiftKey && sendOnEnter) { e.preventDefault(); sendMessage(); } }

// --- UPDATE REPLY LOGIC ---
function setReply(id, user, text) { 
    replyingTo = { id: id, user: user, text: text }; 
    document.getElementById('reply-preview-bar').style.display = 'flex'; 
    document.getElementById('reply-to-user').innerText = user; 
    
    // Potong teks preview jika kepanjangan
    let preview = text;
    if(preview.length > 50) preview = preview.substring(0, 50) + "...";
    document.getElementById('reply-preview-text').innerText = preview; 
    
    document.getElementById('msg-input').focus(); 
}
function cancelReply() { replyingTo = null; document.getElementById('reply-preview-bar').style.display = 'none'; }

function scrollToMessage(msgId) {
    const el = document.getElementById(msgId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash-highlight');
        setTimeout(() => el.classList.remove('flash-highlight'), 1000);
    } else {
        alert("Pesan asli sudah tidak ada (terhapus/terlalu lama).");
    }
}

// --- MEDIA LOGIC (RECORDING & IMAGE) ---
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
function sendVoiceNote() { const reader = new FileReader(); reader.readAsDataURL(audioBlobData); reader.onloadend = () => { publishMessage(reader.result, 'audio'); cancelVoiceNote(); }; }
function cancelVoiceNote() { audioBlobData = null; document.getElementById('vn-preview-bar').style.display = 'none'; document.getElementById('main-input-area').style.display = 'flex'; }
function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempImageBase64 = e.target.result;
            document.getElementById('preview-img').src = tempImageBase64;
            document.getElementById('image-preview-modal').style.display = 'flex';
        }
        reader.readAsDataURL(file);
    }
    input.value = ""; 
}
function triggerImageUpload() { document.getElementById('chat-file-input').click(); }
function cancelImagePreview() {
    document.getElementById('image-preview-modal').style.display = 'none';
    document.getElementById('img-caption').value = "";
    tempImageBase64 = null;
}
function sendImageWithCaption() {
    if (!tempImageBase64) return;
    const caption = document.getElementById('img-caption').value.trim();
    const img = new Image(); img.src = tempImageBase64;
    img.onload = function() {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        const scale = 300 / img.width; canvas.width = 300; canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        publishMessage(compressedBase64, 'image', caption);
        cancelImagePreview();
    }
}
function handleTyping() { if(client && client.connected) client.publish(myRoom, JSON.stringify({ type: 'typing', user: myName })); const el = document.getElementById('msg-input'); el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function showTyping(user) {
    if (user === myName) return;
    const ind = document.getElementById('typing-indicator');
    ind.innerText = `${user} mengetik...`; ind.style.color = "#FFD700";
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { ind.innerText = "from Amogenz"; ind.style.color = "#888"; }, 2000);
}

// --- DISPLAY LOGIC ---
function displaySingleMessage(data) {
    const chatBox = document.getElementById('messages');
    const div = document.createElement('div');
    const isMe = data.user === myName;
    
    // Assign Unique ID to element
    if (data.id) div.id = data.id;

    const isNew = (Date.now() - data.timestamp) < 3000; 
    if (isNew && !isMe && data.type !== 'system') {
        if (isSoundOn) { notifAudio.currentTime = 0; notifAudio.play().catch(() => {}); }
        sendSystemNotification(data.user, data.type === 'text' ? data.content : 'Mengirim media');
    }

    if (data.type === 'system') {
        div.style.textAlign = 'center'; div.style.fontSize = '0.7rem'; 
        div.style.color = '#666'; div.style.margin = "10px 0";
        div.innerText = `${data.user} ${data.content}`;
    } else {
        div.className = isMe ? 'message right' : 'message left';
        let contentHtml = "";
        
        // Tentukan teks preview untuk fungsi Reply
        let replyPreviewText = "Media";
        if (data.type === 'text') { 
            contentHtml = `<span class="msg-content">${data.content}</span>`; 
            replyPreviewText = data.content;
        }
        else if (data.type === 'image') {
            contentHtml = `<img src="${data.content}" class="chat-image">`;
            if(data.caption) contentHtml += `<div class="msg-caption">${data.caption}</div>`;
            replyPreviewText = "📷 Gambar";
        }
        else if (data.type === 'audio') { 
            contentHtml = `<audio controls src="${data.content}"></audio>`; 
            replyPreviewText = "🎤 Audio";
        }

        // Render Blok Balasan (Reply Quote)
        let replyHtml = "";
        if(data.reply) {
            // Potong teks jika kepanjangan di bubble
            let shortText = data.reply.text;
            if(shortText.length > 40) shortText = shortText.substring(0, 40) + "...";
            
            replyHtml = `
                <div class="reply-quote" onclick="scrollToMessage('${data.reply.id}')">
                    <div class="reply-bar"></div>
                    <div class="reply-content">
                        <b>${data.reply.user}</b>
                        <span>${shortText}</span>
                    </div>
                </div>`;
        }
        
        // Tombol Reply (Hanya untuk orang lain)
        // Kita escape petik agar tidak error
        const safeText = replyPreviewText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        // Gunakan ID pesan ini agar reply bisa melompat kembali
        const msgId = data.id || 'unknown';
        const replyBtn = !isMe ? `<span onclick="setReply('${msgId}', '${data.user}', '${safeText}')" class="reply-btn">↩</span>` : '';

        div.innerHTML = `
            <span class="sender-name">${data.user}</span>
            ${replyHtml}
            <div>${contentHtml}<span class="time-info">${data.time} ${replyBtn}</span></div>
        `;
    }
    chatBox.appendChild(div);
}

function leaveRoom() {
    if(confirm("Keluar?")) {
        if(client && client.connected) publishMessage("telah keluar.", 'system');
        clearChatHistory();
        localStorage.removeItem('aksara_name');
        localStorage.removeItem('aksara_room');
        location.reload();
    }
}
