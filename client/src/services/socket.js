import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export const initializeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};