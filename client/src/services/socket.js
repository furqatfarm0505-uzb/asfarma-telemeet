import { io } from 'socket.io-client';

// Automatically connects to the host serving the app, or custom VITE_SERVER_URL if frontend is deployed separately
const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
