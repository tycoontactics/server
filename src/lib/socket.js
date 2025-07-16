import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["https://localhost:5173", "https://tycoontactics.github.io"],
        methods: ["GET", "POST"]
    },
});

const userSocketMap = {};

export function getSocket(userId) {
    return userSocketMap[userId];
}

io.on("connect", (socket) => {
    console.log("a user connected", socket.id);
    
    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket;

    //WebRTC Signalling
    socket.on('offer', ({ targetId, offer }) => {
        console.log(`offering to ${targetId}`);
        io.to(targetId).emit('offer', { fromId: socket.id, offer });
    });

    socket.on('answer', ({ targetId, answer }) => {
        console.log(`answering to ${targetId}`);
        io.to(targetId).emit('answer', { fromId: socket.id, answer });
    });

    socket.on('ice-candidate', ({ targetId, candidate }) => {
        console.log(`ice-candidate to ${targetId}`);
        io.to(targetId).emit('ice-candidate', { fromId: socket.id, candidate });
    });

    socket.on("disconnect", () => {
        console.log("a user disconnected", socket.id);
    });
});
export { io, app, server };