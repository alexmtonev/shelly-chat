import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Client representation
type Client = {
  id: string;
  ws: WebSocket;
  rooms: Set<string>;
};

// In-memory storage for clients and rooms
const clients = new Map<string, Client>();
const rooms = new Map<string, Set<string>>();

// Express setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static demo page
app.use(express.static('public'));

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log("bro connected");
  const id = uuidv4();
  const client: Client = { id, ws, rooms: new Set() };
  clients.set(id, client);

  ws.send(JSON.stringify({ type: 'connected', id }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(client, msg);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    // Remove client from all rooms on disconnect
    for (const room of client.rooms) {
      leaveRoom(client, room);
    }
    clients.delete(id);
  });
});

// Message dispatcher
type IncomingMessage =
  | { type: 'listRooms' }
  | { type: 'subscribe'; room: string }
  | { type: 'unsubscribe'; room: string }
  | { type: 'listUsers'; room: string }
  | { type: 'message'; room: string; message: string };

function handleMessage(client: Client, msg: IncomingMessage) {
  switch (msg.type) {
    case 'listRooms':
      client.ws.send(JSON.stringify({ type: 'rooms', rooms: Array.from(rooms.keys()) }));
      break;

    case 'subscribe':
      joinRoom(client, msg.room);
      break;

    case 'unsubscribe':
      leaveRoom(client, msg.room);
      break;

    case 'listUsers':
      sendUserList(client, msg.room);
      break;

    case 'message':
      broadcastToRoom(client, msg.room, msg.message);
      break;

    default:
      client.ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

// Subscribe client to a room
function joinRoom(client: Client, room: string) {
  if (!rooms.has(room)) {
    rooms.set(room, new Set());
  }
  const members = rooms.get(room)!;

  if (!members.has(client.id)) {
    members.add(client.id);
    client.rooms.add(room);
    // Notify client of successful subscription
    client.ws.send(JSON.stringify({ type: 'subscribed', room }));
    // Broadcast updated user list to all in room
    broadcastUserList(room);
  }
}

// Unsubscribe client from a room
function leaveRoom(client: Client, room: string) {
  const members = rooms.get(room);
  if (!members || !members.has(client.id)) return;

  members.delete(client.id);
  client.rooms.delete(room);
  client.ws.send(JSON.stringify({ type: 'unsubscribed', room }));

  if (members.size === 0) {
    rooms.delete(room);
  } else {
    broadcastUserList(room);
  }
}

// Send list of other users in a room to a client
function sendUserList(client: Client, room: string) {
  const members = rooms.get(room);
  if (!members) {
    client.ws.send(JSON.stringify({ type: 'users', room, users: [] }));
    return;
  }
  const others = Array.from(members).filter((id) => id !== client.id);
  client.ws.send(JSON.stringify({ type: 'users', room, users: others }));
}

// Broadcast current user list to all members of a room
function broadcastUserList(room: string) {
  const members = rooms.get(room);
  if (!members) return;
  const users = Array.from(members);

  for (const id of users) {
    const c = clients.get(id);
    if (c) {
      c.ws.send(JSON.stringify({ type: 'users', room, users }));
    }
  }
}

// Broadcast a message to all clients in a room
function broadcastToRoom(sender: Client, room: string, message: string) {
  const members = rooms.get(room);
  if (!members) return;

  const payload = JSON.stringify({
    type: 'message',
    room,
    from: sender.id,
    message,
    timestamp: Date.now(),
  });

  for (const id of members) {
    const c = clients.get(id);
    if (c) {
      c.ws.send(payload);
    }
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
