import { WebSocket } from "ws";
import { OutgoingMessage } from "./dto";

export type ClientData = {
  id: string;
  ws: WebSocket;
  rooms: Set<string>;
};

export type RoomData = {
  name: string;
  clients: Set<string>;
  type: ERoomType;
};

export enum ERoomType {
  Public = "public",
  Private = "private",
}

export default class ConnectionsHandler {
  public rooms: Map<string, RoomData>;
  public clients: Map<string, ClientData>;

  constructor() {
    this.rooms = new Map();
    this.clients = new Map();
  }

  private send(ws: WebSocket, msg: OutgoingMessage): void {
    ws.send(JSON.stringify(msg));
  }

  public addClient(clientId: string, ws: WebSocket): void {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { id: clientId, ws, rooms: new Set() });
    }
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    for (const roomName of Array.from(client.rooms)) {
      this.leaveRoom(clientId, roomName);
    }

    this.clients.delete(clientId);
  }

  public joinRoom(clientId: string, roomName: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    let room = this.rooms.get(roomName);
    if (!room) {
      room = { name: roomName, clients: new Set(), type: ERoomType.Public };
      this.rooms.set(roomName, room);
      console.log(`New room has been created - "${roomName}"`);
      this.broadcastRoomList();
    }

    room.clients.add(clientId);
    client.rooms.add(roomName);

    const msg: OutgoingMessage = { type: "subscribed", room: roomName };
    this.send(client.ws, msg);

    console.log(`User ${client.id} joined "${roomName}" room`);

    this.broadcastRoomUserList(roomName);
  }

  public leaveRoom(clientId: string, roomName: string): void {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomName);
    if (!client) return;

    if (room) {
      room.clients.delete(clientId);
      if (room.clients.size === 0) {
        this.rooms.delete(roomName);
        this.broadcastRoomList();
        console.log(`Room "${roomName}" has been deleted`);
      }
    }

    client.rooms.delete(roomName);
    const msg: OutgoingMessage = { type: "unsubscribed", room: roomName };
    this.send(client.ws, msg);

    console.log(`User ${client.id} left "${roomName}" room`);

    if (room) {
      this.broadcastRoomUserList(roomName);
    }
  }

  public sendRoomList(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const rooms = this.listPublicRooms();
    const msg: OutgoingMessage = { type: "rooms", rooms };
    this.send(client.ws, msg);
  }

  public broadcastRoomList(): void {
    const rooms = this.listPublicRooms();
    const msg: OutgoingMessage = { type: "rooms", rooms };

    for (const clientData of this.clients.values()) {
      this.send(clientData.ws, msg);
    }
  }

  public sendUserList(clientId: string, roomName: string): void {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomName);
    if (!client) return;

    const users = room
      ? Array.from(room.clients).filter((id) => id !== clientId)
      : [];

    const msg: OutgoingMessage = { type: "users", room: roomName, users };
    this.send(client.ws, msg);
  }

  public broadcastRoomUserList(roomName: string): void {
    const room = this.rooms.get(roomName);
    if (!room) return;

    const users = Array.from(room.clients);
    const msg: OutgoingMessage = { type: "users", room: roomName, users };

    for (const id of users) {
      const client = this.clients.get(id);
      if (client) this.send(client.ws, msg);
    }
  }

  public broadcastMessage(
    senderId: string,
    roomName: string,
    message: string
  ): void {
    const room = this.rooms.get(roomName);
    if (!room) return;

    const payload: OutgoingMessage = {
      type: "message",
      room: roomName,
      from: senderId,
      message,
      timestamp: Date.now(),
      isPrivate: room.type === ERoomType.Private ? true : undefined,
    };

    for (const id of room.clients) {
      const client = this.clients.get(id);
      if (client) this.send(client.ws, payload);
    }
  }

  public sendDirectMessage(
    senderId: string,
    recipientId: string,
    message: string
  ): void {
    const sender = this.clients.get(senderId);
    const recipient = this.clients.get(recipientId);
    if (!sender || !recipient) return;

    // Create a private room with both clients
    const room = this.createPrivateRoom([senderId, recipientId]);

    // Broadcast the message to private room
    this.broadcastMessage(senderId, room.name, message);
  }

  private createPrivateRoom(clients: string[]): RoomData {
    // Sort all client IDs to ensure deterministic room name
    const sortedClients = [...clients].sort();
    const roomName = `private-${sortedClients.join("-")}`;

    // Ensure room doesn't already exist
    let room = this.rooms.get(roomName);
    if (room) {
      return room;
    }

    // Build new private room
    room = { 
      name: roomName,
      clients: new Set<string>(sortedClients),
      type: ERoomType.Private
    };
    this.rooms.set(roomName, room);

    // Add room to each client's data
    for (const clientId of sortedClients) {
      const clientData = this.clients.get(clientId);
      if (clientData) {
        clientData.rooms.add(roomName);
      }
    }

    return room;
  }

  private listPublicRooms(): string[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.type === ERoomType.Public)
      .map((r) => r.name);
  }
}
