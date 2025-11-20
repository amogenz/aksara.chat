let client;
let myName = "";
let myRoom = "";
let storageTopic = ""; 
let mediaRecorder, audioChunks = [], isRecording = false, audioBlobData = null;
let isSoundOn = true;
let sendOnEnter = true;
let replyingTo = null;
let onlineUsers = {};
let typingTimeout;
let localChatHistory = []; // Wadah utama chat

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
    myRoom = "aksara-v29/" + room; // Versi channel baru biar bersih
    storageTopic = myRoom + "/storage"; 

    document.getElementById('side-user').innerText = myName;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('room-display').innerText = "#" + room;
    document.getElementById('typing-indicator').innerText = "Menghubungkan...";

    // 1. Muat dulu apa yang ada di HP (Biar gak kosong pas loading)
    loadFromLocal(); 

    const options = { 
        protocol: 'wss', type: 'mqtt', clean: true, reconnectPeriod: 1000, 
        clientId: 'aks_' + Math.random().toString(16).substr(2, 8) 
    };
    
    client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', options);

    client.on('connect', () => {
        document.getElementById('typing-indicator').innerText = "from Amogenz";
        
        // Subscribe ke topik Room dan Storage
        client.subscribe(myRoom);
        client.subscribe(storageTopic);
        
        publishMessage("bergabung.", 'system');
        
        setInterval(() => {
            client.publish(myRoom, JSON.stringify({ type: 'ping', user: myName }));
            cleanOnlineList();
        }, 10000);
    });

    client.on('message', (topic, message) => {
        const msgString = message.toString();
        
        // A. DATA DARI SERVER (HISTORY)
        if (topic === storageTopic) {
            try {
                const serverHistory = JSON.parse(msgString);
                if (Array.isArray(serverHistory)) {
                    // GABUNGKAN data server dengan data lokal (Smart Merge)
                    mergeWithLocal(serverHistory);
                }
            } catch(e) {}
            return;
        }

        // B. DATA REALTIME (CHAT BARU)
        if (topic === myRoom) {
            try {
                const data = JSON.parse(msgString);
                if (data.type === 'ping') { updateOnlineList(data.user); return; }
                if (data.type === 'typing') { showTyping(data.user); return; }
                
                // Proses pesan baru
                handleIncomingMessage(data);
            } catch (e) {}
        }
    });
}

// --- LOGIKA UTAMA PENYIMPANAN (THE BRAIN) ---

// 1. Muat dari LocalStorage
function loadFromLocal() {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
        localChatHistory = JSON.parse(saved);
        renderChat();
    }
}

// 2. Simpan ke LocalStorage
function saveToLocal() {
    localStorage.setItem(getStorageKey(), JSON.stringify(localChatHistory));
}

// 3. Handle Pesan Masuk Realtime
function handleIncomingMessage(data) {
    if(data.type !== 'system') {
        // Cek duplikat berdasarkan timestamp & user
        const exists = localChatHistory.some(msg => msg.timestamp === data.timestamp && msg.user === data.user);
        
        if (!exists) {
            localChatHistory.push(data);
            
            // Limit 77 Pesan
            if (localChatHistory.length > 77) {
                localChatHistory = localChatHistory.slice(-77); // Ambil 77 terakhir
            }
            
            saveToLocal(); // Simpan di HP
            renderChat();  // Tampilkan
            
            // Jika saya pengirimnya, update "Cloud Storage" agar teman lain bisa ambil
            if (data.user === myName) {
                updateServerStorage();
            }
        }
    } else {
        // Pesan system (bergabung) tidak perlu disimpan permanen
        displaySingleMessage(data); 
    }
}

// 4. Gabungkan Data Server + Lokal (Smart Merge)
function mergeWithLocal(serverData) {
    let isChanged = false;
    
    serverData.forEach(srvMsg => {
        // Cek apakah pesan server ini sudah ada di HP kita?
        const exists = localChatHistory.some(locMsg => locMsg.timestamp === srvMsg.timestamp && locMsg.user === srvMsg.user);
        
        if (!exists) {
            localChatHistory.push(srvMsg);
            isChanged = true;
        }
    });

    if (isChanged) {
        // Urutkan berdasarkan waktu (biar chat lama gak loncat ke bawah)
        localChatHistory.sort((a, b) => a.timestamp - b.timestamp);
        
        // Potong lagi jadi 77
        if (localChatHistory.length > 77) {
            localChatHistory = localChatHistory.slice(-77);
        }

        saveToLocal();
        renderChat();
    }
}

// 5. Update Server (Retain)
function updateServerStorage() {
    // Kirim history lokal kita ke topik storage (Retained = True)
    client.publish(storageTopic, JSON.stringify(localChatHistory), { retain: true, qos: 1 });
}

// 6. Render Ulang Semua Chat
function renderChat() {
    const chatBox = document.getElementById('messages');
    chatBox.innerHTML = '<div class="welcome-msg">Riwayat chat dimuat (Maks 77).</div>';
    localChatHistory.forEach(msg => displaySingleMessage(msg));
    
    // Scroll ke bawah
    setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 50);
}


// --- HELPER FUNCTIONS ---
function getStorageKey() { return 'aksara_history_v29_' + myRoom; }

function handleBackgroundUpload(input) {
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
    
    const payload = { 
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
function setReply(user, text) { replyingTo = { user: user, text: text }; document.getElementById('reply-preview-bar').style.display = 'flex'; document.getElementById('reply-to-user').innerText = user; document.getElementById('reply-preview-text').innerText = text; document.getElementById('msg-input').focus(); }
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

// --- UI DISPLAY SINGLE MESSAGE ---
function displaySingleMessage(data) {
    const chatBox = document.getElementById('messages');
    const div = document.createElement('div');
    const isMe = data.user === myName;

    // Notifikasi & Suara (Hanya utk chat baru realtime, bukan saat load history)
    // Kita cek selisih waktu pesan dengan waktu sekarang, kalau < 2 detik berarti baru
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
        let plainText = "Media";
        
        if (data.type === 'text') { 
            contentHtml = `<span class="msg-content">${data.content}</span>`; 
        }
        else if (data.type === 'image') {
            contentHtml = `<img src="${data.content}" class="chat-image">`;
            if(data.caption && data.caption !== "") {
                contentHtml += `<div class="msg-caption">${data.caption}</div>`;
            }
        }
        else if (data.type === 'audio') { 
            contentHtml = `<audio controls src="${data.content}"></audio>`; 
        }

        let replyHtml = "";
        if(data.reply) {
            replyHtml = `<div class="reply-quote"><b>${data.reply.user}</b><br>${data.reply.text}</div>`;
        }
        const replyBtn = !isMe ? `<span onclick="setReply('${data.user}', 'Reply')" style="cursor:pointer; margin-left:5px;">↩</span>` : '';

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
