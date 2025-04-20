export type OutgoingMessage =
  | { type: 'connected';    id: string }
  | { type: 'subscribed';   room: string }
  | { type: 'unsubscribed'; room: string }
  | { type: 'rooms';        rooms: string[] }
  | { type: 'users';        room: string; users: string[] }
  | { type: 'message';      room: string; from: string; message: string; timestamp: number }
  | { type: 'error';        message: string };
