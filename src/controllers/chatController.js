import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, media, messageType, replyTo } = req.body;
    const senderId = req.user.userId; // Assuming auth middleware sets req.user

    const message = new Message({
      conversationId,
      sender: senderId,
      text,
      media,
      messageType,
      replyTo,
    });

    await message.save();

    // Populate sender and replyTo for the response
    await message.populate('sender', 'name photos');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Update Conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageText: text || (messageType === 'image' ? 'Sent an image' : 'Sent a message'),
      lastMessageAt: new Date(),
      $inc: { [`unreadCount.${senderId}`]: 0 }, // Reset sender's unread? No, increment others.
      // Actually, increment unread for others.
    });

    // Increment unread count for other participants
    const conversation = await Conversation.findById(conversationId);
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== senderId.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });
    await conversation.save();


    // Emit socket event
    const io = req.app.get('io');
    io.to(conversationId).emit('new_message', message);

    // Also emit to participants' personal rooms for notification if they are not in the conversation room
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== senderId.toString()) {
        io.to(participantId.toString()).emit('notification', {
          type: 'new_message',
          message,
          conversationId
        });
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const io = req.app.get('io');
    io.to(message.conversationId.toString()).emit('message_updated', message);

    res.json(message);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body; // boolean
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (deleteForEveryone) {
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this message for everyone' });
      }
      message.isDeletedForEveryone = true;
      message.deletedAt = new Date();
      message.text = 'This message was deleted';
      message.media = null;
    } else {
      // Delete for me only
      message.deletedFor.set(userId.toString(), true);
    }

    await message.save();

    const io = req.app.get('io');
    if (deleteForEveryone) {
      io.to(message.conversationId.toString()).emit('message_deleted', { messageId, deleteForEveryone: true });
    } else {
      // Only notify the user who deleted it (optional, or just return success)
      // But if the user has multiple devices, we might want to emit to their personal room
      io.to(userId.toString()).emit('message_deleted', { messageId, deleteForEveryone: false });
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'name photos')
      .populate('replyTo');

    // Filter out messages deleted for this user
    const filteredMessages = messages.filter(msg => {
      if (msg.isDeletedForEveryone) return true; // Show "deleted" placeholder
      if (msg.deletedFor.get(userId.toString())) return false;
      return true;
    });

    res.json(filteredMessages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`📥 Fetching conversations for user: ${userId}`);

    const conversations = await Conversation.find({ participants: userId })
      .populate({ path: 'participants', select: 'name photos isOnline lastActive', model: 'User' })
      .populate({
        path: 'lastMessage',
        model: 'Message',
        select: '-replyTo',
        populate: {
          path: 'sender',
          select: 'name photos',
          model: 'User'
        }
      })
      .sort({ lastMessageAt: -1 });

    console.log(`✅ Found ${conversations.length} conversations for user ${userId}`);

    // Filter out conversations where population failed or participants are missing
    const validConversations = conversations.filter(conv => {
      return conv.participants &&
        conv.participants.length > 0 &&
        conv.participants.every(p => p && typeof p === 'object' && p._id);
    });

    if (validConversations.length < conversations.length) {
      console.warn(`⚠️ Filtered out ${conversations.length - validConversations.length} invalid conversations`);
    }

    if (validConversations.length > 0) {
      // Debug log to check if population worked
      const samplePart = validConversations[0].participants[0];
      console.log('Sample participant type:', typeof samplePart);
      if (typeof samplePart === 'string' || samplePart instanceof mongoose.Types.ObjectId) {
        console.error('❌ POPULATION FAILED: Participants are still IDs');
      } else {
        console.log('✅ Population successful');
      }
    }

    res.json(validConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.userId;

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
      isOneToOne: true
    });

    if (existingConversation) {
      await existingConversation.populate({ path: 'participants', select: 'name photos isOnline lastActive', model: 'User' });
      await existingConversation.populate({
        path: 'lastMessage',
        model: 'Message',
        select: '-replyTo',
        populate: {
          path: 'sender',
          select: 'name photos',
          model: 'User'
        }
      });
      return res.json(existingConversation);
    }

    const conversation = new Conversation({
      participants: [userId, participantId],
      isOneToOne: true
    });

    await conversation.save();
    await conversation.populate({ path: 'participants', select: 'name photos isOnline lastActive', model: 'User' });
    res.status(201).json(conversation);

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Reset unread count for this user
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    // Mark messages as read (optional, if you want per-message read status)
    // await Message.updateMany(
    //     { conversationId, readBy: { $ne: userId } },
    //     { $addToSet: { readBy: userId } }
    // );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
