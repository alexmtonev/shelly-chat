import { WebSocket } from 'ws';

export type ClientData = {
  id: string;
  ws: WebSocket;
  rooms: Set<string>;
};

export type RoomData = {
  name: string;
  clients: Set<string>;
  type: 'public' | 'private';
};

export default class ConnectionsHandler {
  public rooms: Map<string, RoomData>;
  public clients: Map<string, ClientData>;

  constructor() {
    this.rooms = new Map();
    this.clients = new Map();
  }

  public addClient(clientId: string, ws: WebSocket): void {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { id: clientId, ws, rooms: new Set() });
    }
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    // Leave all rooms
    for (const roomName of Array.from(client.rooms)) {
      this.leaveRoom(clientId, roomName);
    }
    this.clients.delete(clientId);
  }

  public listRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  public getClientRooms(clientId: string): string[] {
    const client = this.clients.get(clientId);
    return client ? Array.from(client.rooms) : [];
  }

  public listRoomUsers(roomName: string): string[] {
    const room = this.rooms.get(roomName);
    return room ? Array.from(room.clients) : [];
  }

  public joinRoom(
    clientId: string,
    roomName: string,
    roomType: 'public' | 'private' = 'public'
  ): void {
    // Ensure client exists
    const client = this.clients.get(clientId);
    if (!client) return;

    // Get or create room
    let room = this.rooms.get(roomName);
    if (!room) {
      room = { name: roomName, clients: new Set(), type: roomType };
      this.rooms.set(roomName, room);
    }

    // Link both sides
    room.clients.add(clientId);
    client.rooms.add(roomName);

    // Notify client
    client.ws.send(JSON.stringify({ type: 'subscribed', room: roomName }));
    // Broadcast updated user list
    this.broadcastUserList(roomName);
  }

  public leaveRoom(clientId: string, roomName: string): void {
    const room = this.rooms.get(roomName);
    const client = this.clients.get(clientId);
    if (!client) return;

    if (room) {
      room.clients.delete(clientId);
      if (room.clients.size === 0) {
        this.rooms.delete(roomName);
      }
    }

    client.rooms.delete(roomName);
    client.ws.send(JSON.stringify({ type: 'unsubscribed', room: roomName }));

    if (room) {
      this.broadcastUserList(roomName);
    }
  }

  public sendUserList(clientId: string, roomName: string): void {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomName);
    if (!client) return;

    const users = room
      ? Array.from(room.clients).filter(id => id !== clientId)
      : [];

    client.ws.send(JSON.stringify({ type: 'users', room: roomName, users }));
  }

  public broadcastUserList(roomName: string): void {
    const room = this.rooms.get(roomName);
    if (!room) return;

    const users = Array.from(room.clients);
    for (const id of users) {
      const client = this.clients.get(id);
      client?.ws.send(JSON.stringify({ type: 'users', room: roomName, users }));
    }
  }

  public broadcastMessage(
    senderId: string,
    roomName: string,
    message: string
  ): void {
    const room = this.rooms.get(roomName);
    if (!room) return;

    const payload = JSON.stringify({
      type: 'message',
      room: roomName,
      from: senderId,
      message,
      timestamp: Date.now(),
    });

    for (const id of room.clients) {
      const client = this.clients.get(id);
      client?.ws.send(payload);
    }
  }
}
