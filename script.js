let client;
let myName = "";
let myRoom = "";
let mediaRecorder, audioChunks = [], isRecording = false, audioBlobData = null;
let isSoundOn = true;
let sendOnEnter = true;
let replyingTo = null;
let onlineUsers = {};

const notifAudio = document.getElementById('notifSound');

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
    } else {
        document.getElementById('enter-toggle').checked = true;
    }
};

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isActive = sidebar.style.left === '0px';
    sidebar.style.left = isActive ? '-300px' : '0px';
    overlay.style.display = isActive ? 'none' : 'block';
}

function toggleSound() {
    isSoundOn = document.getElementById('sound-toggle').checked;
    localStorage.setItem('aksara_sound', isSoundOn);
}

function toggleEnterSettings() {
    sendOnEnter = document.getElementById('enter-toggle').checked;
    localStorage.setItem('aksara_enter', sendOnEnter);
}

function requestNotifPermission() {
    if (!("Notification" in window)) {
        alert("Browser ini tidak mendukung notifikasi sistem.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notifikasi sistem diaktifkan!");
        } else {
            alert("Izin ditolak.");
        }
    });
}

function sendSystemNotification(user, text) {
    if (document.visibilityState === "hidden" && Notification.permission === "granted") {
        const notif = new Notification(`Aksara: ${user}`, {
            body: text,
            icon: "https://i.imgur.com/Ct0pzwl.png",
            vibrate: [200, 100, 200]
        });
        notif.onclick = function() { window.focus(); this.close(); };
    }
}

function startChat() {
    const user = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim().toLowerCase();
    if (!user || !room) { alert("Isi semua data bro!"); return; }

    localStorage.setItem('aksara_name', user);
    localStorage.setItem('aksara_room', room);
    myName = user;
    myRoom = "aksara-v7/" + room;

    document.getElementById('side-user').innerText = myName;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('room-display').innerText = "#" + room;

    const options = { protocol: 'wss', type: 'mqtt' };
    client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', options);

    client.on('connect', () => {
        client.subscribe(myRoom);
        publishMessage("telah bergabung.", 'system');
        setInterval(() => {
            client.publish(myRoom, JSON.stringify({ type: 'ping', user: myName }));
            cleanOnlineList();
        }, 10000);
    });

    client.on('message', (topic, message) => {
        if (topic === myRoom) {
            const data = JSON.parse(message.toString());
            if (data.type === 'ping') { updateOnlineList(data.user); return; }
            if (data.type === 'typing') { showTyping(data.user); return; }
            displayMessage(data);
        }
    });
}

function updateOnlineList(user) { onlineUsers[user] = Date.now(); renderOnlineList(); }
function cleanOnlineList() {
    const now = Date.now();
    for (const user in onlineUsers) { if (now - onlineUsers[user] > 25000) delete onlineUsers[user]; }
    renderOnlineList();
}
function renderOnlineList() {
    const list = document.getElementById('online-list');
    const count = document.getElementById('online-count');
    list.innerHTML = "";
    let total = 0;
    for (const user in onlineUsers) {
        total++;
        const li = document.createElement('li');
        li.style.color = "#aaa"; li.style.marginBottom = "5px"; li.style.fontSize = "0.9rem";
        li.innerHTML = `<span style="color:#0f0">●</span> ${user}`;
        list.appendChild(li);
    }
    count.innerText = total;
}

function publishMessage(content, type = 'text') {
    if (!content) return;
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    client.publish(myRoom, JSON.stringify({ 
        user: myName, content: content, type: type, 
        time: timeString, reply: replyingTo 
    }));
    cancelReply();
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (text) {
        publishMessage(text, 'text');
        input.value = '';
        input.style.height = 'auto'; 
        input.focus();
    }
}

function handleEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        if (sendOnEnter) {
            e.preventDefault(); 
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
function cancelReply() {
    replyingTo = null;
    document.getElementById('reply-preview-bar').style.display = 'none';
}

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
                document.getElementById('vn-player').src = URL.createObjectURL(audioBlobData);
                document.getElementById('vn-preview-bar').style.display = 'flex';
                document.getElementById('main-input-area').style.display = 'none';
            };
            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add('recording');
        } catch (err) { alert("Butuh izin mic!"); }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        micBtn.classList.remove('recording');
    }
}
function sendVoiceNote() {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlobData); 
    reader.onloadend = () => { publishMessage(reader.result, 'audio'); cancelVoiceNote(); };
}
function cancelVoiceNote() {
    audioBlobData = null;
    document.getElementById('vn-preview-bar').style.display = 'none';
    document.getElementById('main-input-area').style.display = 'flex';
}
function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image(); img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const scale = 300 / img.width;
                canvas.width = 300; canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                publishMessage(canvas.toDataURL('image/jpeg', 0.6), 'image');
            }
        }
        reader.readAsDataURL(file);
    }
    input.value = "";
}

function handleTyping() {
    const el = document.getElementById('msg-input');
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    client.publish(myRoom, JSON.stringify({ type: 'typing', user: myName }));
}
function showTyping(user) {
    if (user === myName) return;
    const ind = document.getElementById('typing-indicator');
    ind.innerText = `${user} mengetik...`; ind.style.opacity = '1';
    setTimeout(() => { ind.style.opacity = '0'; }, 2000);
}

function displayMessage(data) {
    const chatBox = document.getElementById('messages');
    const div = document.createElement('div');
    const isMe = data.user === myName;

    if (!isMe && data.type !== 'system') {
        if (isSoundOn) notifAudio.play().catch(() => {});
        sendSystemNotification(data.user, data.type === 'text' ? data.content : 'Mengirim media');
    }

    if (data.type === 'system') {
        div.style.textAlign = 'center'; div.style.fontSize = '0.75rem'; 
        div.style.color = '#666'; div.style.margin = "10px 0";
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
            replyHtml = `<div style="background:rgba(0,0,0,0.1); border-left:3px solid ${isMe?'#333':'#FFD700'}; padding:4px 8px; border-radius:4px; font-size:0.75rem; margin-bottom:4px;">
                <b>${data.reply.user}</b><br>${data.reply.text.substring(0,20)}...
            </div>`;
        }

        const replyBtn = !isMe ? `<span onclick="setReply('${data.user}', '${plainText.replace(/'/g,"\\'")}')" style="cursor:pointer; margin-left:5px;">↩</span>` : '';

        div.innerHTML = `
            ${replyHtml}
            <span class="sender-name">${data.user} ${replyBtn}</span>
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
        publishMessage("telah keluar.", 'system');
        localStorage.removeItem('aksara_name');
        localStorage.removeItem('aksara_room');
        location.reload();
    }
}
