import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import ConnectionsHandler, { ERoomType } from './connectionsHandler';

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Initialize our connection state manager
const connections = new ConnectionsHandler();

// Incoming message types
type IncomingMessage =
  | { type: 'listRooms' }
  | { type: 'subscribe'; room: string; roomType?: ERoomType }
  | { type: 'unsubscribe'; room: string }
  | { type: 'listUsers'; room: string }
  | { type: 'message'; room: string; message: string };

// Handle new WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
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
        const rooms = connections.listRooms();
        ws.send(JSON.stringify({ type: 'rooms', rooms }));
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
