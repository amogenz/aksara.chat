
let client;
let myName = "";
let myRoom = "";

// Audio & Rec Vars
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let audioBlobData = null;

// Settings & State
let isSoundOn = true;
let replyingTo = null;
let onlineUsers = {};

// Load Settings saat halaman dibuka
window.onload = function() {
    if(localStorage.getItem('aksara_name')) document.getElementById('username').value = localStorage.getItem('aksara_name');
    if(localStorage.getItem('aksara_room')) document.getElementById('room').value = localStorage.getItem('aksara_room');
    const savedSound = localStorage.getItem('aksara_sound');
    if(savedSound !== null) {
        isSoundOn = (savedSound === 'true');
        document.getElementById('sound-toggle').checked = isSoundOn;
    }
};

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isActive = sidebar.style.left === '0px';
    sidebar.style.left = isActive ? '-280px' : '0px';
    overlay.style.display = isActive ? 'none' : 'block';
}

function toggleSound() {
    isSoundOn = document.getElementById('sound-toggle').checked;
    localStorage.setItem('aksara_sound', isSoundOn);
}

function startChat() {
    const user = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim().toLowerCase();
    if (!user || !room) { alert("Nama & Ruang wajib diisi!"); return; }

    localStorage.setItem('aksara_name', user);
    localStorage.setItem('aksara_room', room);
    myName = user;
    myRoom = "aksara-v4/" + room;

    document.getElementById('side-user').innerText = myName;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('room-display').innerText = "#" + room;

    const options = { protocol: 'wss', type: 'mqtt' };
    client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', options);

    client.on('connect', () => {
        client.subscribe(myRoom);
        publishMessage("bergabung.", 'system');
        
        // Heartbeat Loop (Kirim sinyal 'Saya Online' setiap 10 detik)
        setInterval(() => {
            client.publish(myRoom, JSON.stringify({ type: 'ping', user: myName }));
            cleanOnlineList();
        }, 10000);
    });

    client.on('message', (topic, message) => {
        if (topic === myRoom) {
            const data = JSON.parse(message.toString());
            
            // Handle Ping (Presence)
            if (data.type === 'ping') {
                updateOnlineList(data.user);
                return; 
            }

            if (data.type === 'typing') {
                showTyping(data.user);
            } else {
                displayMessage(data);
            }
        }
    });
}

// --- PRESENCE SYSTEM ---
function updateOnlineList(user) {
    onlineUsers[user] = Date.now();
    renderOnlineList();
}

function cleanOnlineList() {
    const now = Date.now();
    for (const user in onlineUsers) {
        if (now - onlineUsers[user] > 25000) {
            delete onlineUsers[user];
        }
    }
    renderOnlineList();
}

function renderOnlineList() {
    const list = document.getElementById('online-list');
    list.innerHTML = "";
    for (const user in onlineUsers) {
        const li = document.createElement('li');
        li.innerHTML = `<div class="status-dot"></div> ${user === myName ? user + " (Anda)" : user}`;
        list.appendChild(li);
    }
}

// --- MESSAGING ---
function publishMessage(content, type = 'text') {
    if (!content) return;
    client.publish(myRoom, JSON.stringify({ type: 'typing', user: myName, status: false }));

    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const payload = { 
        user: myName, content: content, type: type, time: timeString,
        reply: replyingTo 
    };
    
    client.publish(myRoom, JSON.stringify(payload));
    cancelReply(); 
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (text) {
        publishMessage(text, 'text');
        input.value = '';
        input.focus();
    }
}

// --- REPLY FEATURE ---
function setReply(user, text) {
    replyingTo = { user: user, text: text };
    document.getElementById('reply-preview-bar').style.display = 'flex';
    document.getElementById('reply-to-user').innerText = user;
    document.getElementById('reply-preview-text').innerText = text;
    document.getElementById('msg-input').focus();
}

function cancelReply() {
    replyingTo = null;
    document.getElementById('reply-preview-bar').style.display = 'none';
}

// --- VOICE NOTE PREVIEW ---
async function toggleRecording() {
    const micBtn = document.getElementById('mic-btn');
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                audioBlobData = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlobData);
                document.getElementById('vn-player').src = audioUrl;
                document.getElementById('vn-preview-bar').style.display = 'flex';
                document.getElementById('main-input-area').style.display = 'none';
            };
            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add('recording');
            document.getElementById('msg-input').placeholder = "Sedang merekam...";
        } catch (err) { alert("Butuh izin mikrofon!"); }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        micBtn.classList.remove('recording');
        document.getElementById('msg-input').placeholder = "Ketik pesan...";
    }
}

function sendVoiceNote() {
    if (audioBlobData) {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlobData); 
        reader.onloadend = () => {
            publishMessage(reader.result, 'audio');
            cancelVoiceNote();
        };
    }
}

function cancelVoiceNote() {
    audioBlobData = null;
    document.getElementById('vn-preview-bar').style.display = 'none';
    document.getElementById('main-input-area').style.display = 'flex';
}

// --- IMAGE HANDLER ---
function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 300; 
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                publishMessage(canvas.toDataURL('image/jpeg', 0.5), 'image');
            }
        }
        reader.readAsDataURL(file);
    }
    input.value = "";
}

// --- UI HELPERS ---
function handleTyping() {
    client.publish(myRoom, JSON.stringify({ type: 'typing', user: myName, status: true }));
    setTimeout(() => client.publish(myRoom, JSON.stringify({ type: 'typing', user: myName, status: false })), 2000);
}

function showTyping(user) {
    if (user === myName) return;
    const indicator = document.getElementById('typing-indicator');
    indicator.innerText = `${user} mengetik...`;
    indicator.style.opacity = '1';
    setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
}

function displayMessage(data) {
    const chatBox = document.getElementById('messages');
    const div = document.createElement('div');
    const isMe = data.user === myName;

    if (data.type === 'system') {
        div.style.textAlign = 'center'; div.style.fontSize = '0.7rem'; 
        div.style.color = '#666'; div.innerText = `${data.user} ${data.content}`;
    } else {
        if(!isMe && isSoundOn) {
            const audio = document.getElementById('notifSound');
            audio.play().catch(e => {});
        }

        div.className = isMe ? 'message right' : 'message left';
        
        let replyHtml = "";
        if(data.reply) {
            replyHtml = `
                <div class="reply-quote">
                    <span class="reply-sender">${data.reply.user}</span>
                    <span>${data.reply.text.substring(0, 30)}...</span>
                </div>
            `;
        }

        let contentHtml = "";
        let plainText = "Media"; 
        if (data.type === 'text') {
            contentHtml = `<span>${data.content}</span>`;
            plainText = data.content;
        }
        else if (data.type === 'image') contentHtml = `<img src="${data.content}" class="chat-image"><div style="font-size:0.7rem; margin-top:5px">📷 Foto</div>`;
        else if (data.type === 'audio') contentHtml = `<audio controls src="${data.content}"></audio><div style="font-size:0.7rem; margin-top:5px">🎤 VN</div>`;

        const replyBtn = `<button class="reply-btn" onclick="setReply('${data.user}', '${plainText.replace(/'/g, "\\'")}')">↩</button>`;

        div.innerHTML = `
            ${replyHtml}
            <span class="sender-name">
                ${data.user} ${!isMe ? replyBtn : ''}
            </span>
            ${contentHtml}
            <span class="time-info">${data.time}</span>
        `;
    }
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function leaveRoom() {
    if(confirm("Keluar?")) {
        publishMessage("keluar.", 'system');
        localStorage.removeItem('aksara_name');
        localStorage.removeItem('aksara_room');
        location.reload();
    }
}

function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }
      
