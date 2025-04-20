export type IncomingMessage =
  | { type: 'listRooms' }
  | { type: 'subscribe';   room: string }
  | { type: 'unsubscribe'; room: string }
  | { type: 'listUsers';   room: string }
  | { type: 'message';     room: string; message: string };
