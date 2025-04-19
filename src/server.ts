import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import ConnectionsHandler from './connectionsHandler';

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

const connections = new ConnectionsHandler();

type IncomingMessage =
  | { type: 'listRooms' }
  | { type: 'subscribe'; room: string; }
  | { type: 'unsubscribe'; room: string }
  | { type: 'listUsers'; room: string }
  | { type: 'message'; room: string; message: string };

type OutgoingMessage = 
  | {};

wss.on('connection', (ws: WebSocket) => {
  const clientId = crypto.randomUUID();
  console.log(`Client connected: ${clientId}`);

  // Register client
  connections.addClient(clientId, ws);

  // Notify client of assigned ID
  ws.send(JSON.stringify({ type: 'connected', id: clientId }));

  // Handle messages
  ws.on('message', (data) => {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    switch (msg.type) {
      case 'listRooms':
        connections.sendRoomList(clientId)
        break;

      case 'subscribe':
        connections.joinRoom(
          clientId,
          msg.room
        );
        break;

      case 'unsubscribe':
        connections.leaveRoom(clientId, msg.room);
        break;

      case 'listUsers':
        connections.sendUserList(clientId, msg.room);
        break;

      case 'message':
        connections.broadcastMessage(clientId, msg.room, msg.message);
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        break;
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    connections.removeClient(clientId);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
