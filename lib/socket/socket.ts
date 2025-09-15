import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    // Determine server URL based on current location
    let serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

    if (!serverUrl) {
      // If no env var, use current host for development
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        serverUrl = `${protocol}//${hostname}:3002`;
      } else {
        serverUrl = 'http://localhost:3002';
      }
    }

    console.log('Connecting to server:', serverUrl);

    socket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Start with polling, then upgrade to websocket
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true
    });

    // Debug connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};