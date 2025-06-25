import { Server } from 'socket.io';

let io;

/**
 * Initializes the Socket.IO server and attaches it to the provided HTTP server.
 * It configures CORS and sets up event listeners for client connections.
 * @param {http.Server} server - The Node.js HTTP server.
 * @returns The initialized Socket.IO instance.
 */
function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*", // In a production environment, restrict this to your frontend's domain for security.
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected via WebSocket:', socket.id);

        // Listen for a client to join a room for a specific hotel
        socket.on('joinHotel', (hotelId) => {
            if (hotelId) {
                const roomName = `hotel_${hotelId}`;
                socket.join(roomName);
                console.log(`Socket ${socket.id} joined room: ${roomName}`);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}

/**
 * Returns the active Socket.IO instance.
 * Throws an error if the instance has not been initialized.
 * @returns The Socket.IO server instance.
 */
function getIO() {
    if (!io) {
        throw new Error("Socket.IO is not initialized!");
    }
    return io;
}

export { initSocket, getIO };
