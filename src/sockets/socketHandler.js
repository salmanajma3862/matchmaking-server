import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const socketHandler = (io) => {
  console.log('[Socket] 🔌 Socket handler initialized');

  io.on('connection', async (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`[Socket] ✅ New client connected - Socket ID: ${socket.id}, User ID: ${userId}`);

    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
        socket.join(userId); // Join a room with their own ID for personal notifications
        console.log(`[Socket] 👤 User ${userId} joined personal room and marked online`);
        io.emit('user_status_change', { userId, isOnline: true });
        console.log(`[Socket] 📢 Emitted user_status_change: ${userId} is online`);
      } catch (error) {
        console.error(`[Socket] ❌ Error updating user status for ${userId}:`, error);
      }
    }

    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(conversationId);
      console.log(`[Socket] 💬 User ${userId} joined conversation room: ${conversationId}`);
      // Log all rooms this socket is in
      const rooms = Array.from(socket.rooms);
      console.log(`[Socket] 📍 Socket ${socket.id} is now in rooms:`, rooms);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(conversationId);
      console.log(`[Socket] 🚪 User ${userId} left conversation room: ${conversationId}`);
    });

    socket.on('typing_start', ({ conversationId }) => {
      console.log(`[Socket] ⌨️ User ${userId} started typing in conversation: ${conversationId}`);
      socket.to(conversationId).emit('typing_start', { conversationId, userId });
      console.log(`[Socket] 📤 Emitted typing_start to room: ${conversationId}`);
    });

    socket.on('typing_stop', ({ conversationId }) => {
      console.log(`[Socket] ⌨️ User ${userId} stopped typing in conversation: ${conversationId}`);
      socket.to(conversationId).emit('typing_stop', { conversationId, userId });
      console.log(`[Socket] 📤 Emitted typing_stop to room: ${conversationId}`);
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] 🔴 Client disconnected - Socket ID: ${socket.id}, User ID: ${userId}`);
      if (userId) {
        try {
          await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });
          io.emit('user_status_change', { userId, isOnline: false, lastActive: new Date() });
          console.log(`[Socket] 📢 Emitted user_status_change: ${userId} is offline`);
        } catch (error) {
          console.error(`[Socket] ❌ Error updating disconnect status for ${userId}:`, error);
        }
      }
    });
  });
};

