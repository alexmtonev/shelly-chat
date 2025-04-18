const ws = new WebSocket(`ws://${location.host}`);
let clientId = null;
let currentRoom = null;

// DOM elements
const roomListEl = document.getElementById('room-list');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');

const currentRoomEl = document.getElementById('current-room');
const messagesEl = document.getElementById('messages');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

const userListEl = document.getElementById('user-list');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'listRooms' }));
});

ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  switch (msg.type) {
    case 'connected':
      clientId = msg.id;
      break;
    case 'rooms':
      renderRooms(msg.rooms);
      break;
    case 'subscribed':
      currentRoom = msg.room;
      currentRoomEl.textContent = currentRoom;
      leaveBtn.disabled = false;
      msgInput.disabled = false;
      sendBtn.disabled = false;
      break;
    case 'unsubscribed':
      clearChat();
      break;
    case 'users':
      if (msg.room === currentRoom) renderUsers(msg.users);
      break;
    case 'message':
      if (msg.room === currentRoom) appendMessage(msg);
      break;
    case 'error':
      alert(msg.message);
      break;
  }
});

joinBtn.addEventListener('click', () => {
  const room = roomInput.value.trim();
  if (!room) return;
  ws.send(JSON.stringify({ type: 'subscribe', room }));
});

leaveBtn.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'unsubscribe', room: currentRoom }));
  currentRoom = null;
  currentRoomEl.textContent = 'No room';
  leaveBtn.disabled = true;
  msgInput.disabled = true;
  sendBtn.disabled = true;
});

sendBtn.addEventListener('click', () => {
  const text = msgInput.value.trim();
  if (!text) return;
  ws.send(JSON.stringify({ type: 'message', room: currentRoom, message: text }));
  msgInput.value = '';
});

function renderRooms(rooms) {
  roomListEl.innerHTML = '';
  rooms.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    li.addEventListener('click', () => {
      roomInput.value = r;
    });
    roomListEl.appendChild(li);
  });
}

function renderUsers(users) {
  userListEl.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    userListEl.appendChild(li);
  });
}

function appendMessage({ from, message, timestamp }) {
  const div = document.createElement('div');
  div.classList.add('message');
  const time = new Date(timestamp).toLocaleTimeString();
  div.innerHTML = `<div class="meta">${from} @ ${time}</div><div class="text">${message}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearChat() {
  messagesEl.innerHTML = '';
  userListEl.innerHTML = '';
}