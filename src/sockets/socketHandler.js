import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const socketHandler = (io) => {
  io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);

    const userId = socket.handshake.query.userId;

    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
        socket.join(userId); // Join a room with their own ID for personal notifications
        io.emit('user_status_change', { userId, isOnline: true });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }

    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(conversationId);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(conversationId);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    socket.on('typing_start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing_start', { conversationId, userId });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing_stop', { conversationId, userId });
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      if (userId) {
        try {
          await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });
          io.emit('user_status_change', { userId, isOnline: false, lastActive: new Date() });
        } catch (error) {
          console.error('Error updating user status:', error);
        }
      }
    });
  });
};
