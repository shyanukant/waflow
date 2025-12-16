import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Initialize Socket.IO connection
 */
export const initSocket = (): Socket => {
    if (!socket) {
        // Connect to backend API URL
        const apiUrl = import.meta.env.VITE_API_URL || '';

        socket = io(apiUrl, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('Socket.IO connected');
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
        });
    }

    return socket;
};

/**
 * Get existing socket instance
 */
export const getSocket = (): Socket => {
    if (!socket) {
        return initSocket();
    }
    return socket;
};

export default { initSocket, getSocket };
