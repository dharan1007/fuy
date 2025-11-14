// src/lib/socket.ts
import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

interface SocketUser {
  userId: string;
  socketId: string;
}

let io: SocketIOServer | null = null;
const connectedUsers: Map<string, SocketUser> = new Map();
const socketToUser: Map<string, string> = new Map(); // Map socket ID to user ID

export function initializeSocket(httpServer: any): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL || "*"
          : "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.debug(`[Socket] User connected: ${socket.id}`);

    // User authentication and registration
    socket.on("user:register", (userId: string) => {
      // Remove old socket mapping if user already connected
      const oldSocketId = Array.from(socketToUser.entries()).find(
        ([_, uid]) => uid === userId
      )?.[0];
      if (oldSocketId) {
        socketToUser.delete(oldSocketId);
        connectedUsers.delete(oldSocketId);
      }

      // Register new socket
      socketToUser.set(socket.id, userId);
      connectedUsers.set(socket.id, { userId, socketId: socket.id });
      socket.join(`user:${userId}`); // Join user-specific room

      logger.debug(`[Socket] User registered: ${userId} (${socket.id})`);

      // Emit online status to all users
      io?.emit("user:online", { userId, socketId: socket.id });
    });

    // Handle typing indicator
    socket.on("typing:start", (data: { conversationId: string }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      // Broadcast to all users in the conversation except sender
      socket.broadcast.to(`conversation:${data.conversationId}`).emit("typing:start", {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("typing:end", (data: { conversationId: string }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      socket.broadcast.to(`conversation:${data.conversationId}`).emit("typing:end", {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Handle message events
    socket.on("message:send", (data: { conversationId: string; message: any }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      // Join the conversation room
      socket.join(`conversation:${data.conversationId}`);

      // Broadcast to all users in the conversation
      io?.to(`conversation:${data.conversationId}`).emit("message:new", {
        ...data.message,
        timestamp: new Date().getTime(),
      });

      logger.debug(
        `[Socket] Message sent in conversation ${data.conversationId} by ${userId}`
      );
    });

    // Handle message read status
    socket.on("message:read", (data: { conversationId: string; messageIds: string[] }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      io?.to(`conversation:${data.conversationId}`).emit("message:read", {
        userId,
        messageIds: data.messageIds,
      });
    });

    socket.on("disconnect", () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        socketToUser.delete(socket.id);
        connectedUsers.delete(socket.id);
        logger.debug(`[Socket] User disconnected: ${userId}`);
        io?.emit("user:offline", { userId });
      }
    });
  });

  return io;
}

export function getSocket(): SocketIOServer | null {
  return io;
}

export function getOnlineUsers(): SocketUser[] {
  return Array.from(connectedUsers.values());
}

export function isUserOnline(userId: string): boolean {
  return Array.from(socketToUser.values()).includes(userId);
}

export function getUserSocketId(userId: string): string | undefined {
  return Array.from(socketToUser.entries()).find(
    ([_, uid]) => uid === userId
  )?.[0];
}
