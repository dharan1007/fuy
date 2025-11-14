// src/lib/socket.ts
import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

let io: SocketIOServer | null = null;

interface Socket {
  userId: string;
  socketId: string;
}

const connectedUsers: Map<string, Socket> = new Map();

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
      const existingSocket = Array.from(connectedUsers.values()).find(
        (s) => s.userId === userId
      );
      if (existingSocket) {
        connectedUsers.delete(existingSocket.socketId);
      }

      connectedUsers.set(socket.id, { userId, socketId: socket.id });
      socket.userId = userId;
      socket.join(`user:${userId}`); // Join user-specific room

      logger.debug(`[Socket] User registered: ${userId} (${socket.id})`);

      // Emit online status to all users
      io?.emit("user:online", { userId, socketId: socket.id });
    });

    // Handle typing indicator
    socket.on("typing:start", (data: { conversationId: string }) => {
      if (!socket.userId) return;

      // Broadcast to all users in the conversation except sender
      socket.broadcast.to(`conversation:${data.conversationId}`).emit("typing:start", {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("typing:end", (data: { conversationId: string }) => {
      if (!socket.userId) return;

      socket.broadcast.to(`conversation:${data.conversationId}`).emit("typing:end", {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Handle message events
    socket.on("message:send", (data: { conversationId: string; message: any }) => {
      if (!socket.userId) return;

      // Join the conversation room
      socket.join(`conversation:${data.conversationId}`);

      // Broadcast to all users in the conversation
      io?.to(`conversation:${data.conversationId}`).emit("message:new", {
        ...data.message,
        timestamp: new Date().getTime(),
      });

      logger.debug(
        `[Socket] Message sent in conversation ${data.conversationId} by ${socket.userId}`
      );
    });

    // Handle message read status
    socket.on("message:read", (data: { conversationId: string; messageIds: string[] }) => {
      if (!socket.userId) return;

      io?.to(`conversation:${data.conversationId}`).emit("message:read", {
        userId: socket.userId,
        messageIds: data.messageIds,
      });
    });

    socket.on("disconnect", () => {
      const userData = connectedUsers.get(socket.id);
      if (userData) {
        connectedUsers.delete(socket.id);
        logger.debug(`[Socket] User disconnected: ${userData.userId}`);
        io?.emit("user:offline", { userId: userData.userId });
      }
    });
  });

  return io;
}

export function getSocket(): SocketIOServer | null {
  return io;
}

export function getOnlineUsers(): Socket[] {
  return Array.from(connectedUsers.values());
}

export function isUserOnline(userId: string): boolean {
  return Array.from(connectedUsers.values()).some((s) => s.userId === userId);
}

export function getUserSocketId(userId: string): string | undefined {
  return Array.from(connectedUsers.entries()).find(
    ([_, socket]) => socket.userId === userId
  )?.[0];
}
