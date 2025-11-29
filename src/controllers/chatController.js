import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { uploadFile, getFileUrl } from '../services/azureStorageService.js';

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, messageType, replyTo } = req.body;
    const senderId = req.user.userId; // Assuming auth middleware sets req.user
    let media = req.body.media || {};

    if (req.file) {
      console.log(`[Chat] File received: ${req.file.originalname} (${req.file.mimetype})`);
      const blobName = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      media = {
        mediaId: blobName,
        imageUrl: null, // We will generate this dynamically
        audioUrl: null,
        videoUrl: null,
        fileUrl: null
      };
      console.log(`[Chat] File uploaded to Azure. Media ID: ${blobName}`);
    } else {
      console.log('[Chat] No file received in request');
    }

    let finalMessageType = messageType;
    if (req.file) {
      if (req.file.mimetype.startsWith('image/')) {
        finalMessageType = 'image';
      } else if (req.file.mimetype.startsWith('audio/')) {
        finalMessageType = 'audio';
      } else {
        finalMessageType = 'file';
      }
    }

    const message = new Message({
      conversationId,
      sender: senderId,
      text,
      media,
      messageType: finalMessageType,
      replyTo,
    });

    await message.save();

    // Populate sender and replyTo for the response
    await message.populate('sender', 'name photos');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name photos', model: 'User' }
      });
    }

    // Update Conversation
    let lastMessageText = text;
    if (!lastMessageText) {
      switch (finalMessageType) {
        case 'image': lastMessageText = 'Sent an image'; break;
        case 'audio': lastMessageText = 'Sent an audio message'; break;
        default: lastMessageText = 'Sent a message';
      }
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageText: lastMessageText,
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
    // We need to add the SAS token to the emitted message so the sender sees it immediately
    const messageObj = message.toObject();
    if (messageObj.media && messageObj.media.mediaId) {
      if (finalMessageType === 'image') {
        messageObj.media.imageUrl = getFileUrl(messageObj.media.mediaId);
      } else if (finalMessageType === 'audio') {
        messageObj.media.audioUrl = getFileUrl(messageObj.media.mediaId);
      }
    }

    io.to(conversationId).emit('new_message', messageObj);

    // Also emit to participants' personal rooms for notification if they are not in the conversation room
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== senderId.toString()) {
        io.to(participantId.toString()).emit('notification', {
          type: 'new_message',
          message: messageObj,
          conversationId
        });
      }
    });

    res.status(201).json(messageObj);
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

    await message.populate('sender', 'name photos');
    if (message.replyTo) {
      await message.populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name photos', model: 'User' }
      });
    }

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

      // Save original content before overwriting
      message.originalContent = message.text;

      message.isDeletedForEveryone = true;
      message.deletedAt = new Date();
      message.text = 'message deleted for everyone';
      message.media = null;
    } else {
      // Delete for me only
      message.deletedFor.set(userId.toString(), true);
    }

    await message.save();

    const io = req.app.get('io');
    if (deleteForEveryone) {
      // Emit the updated message structure so clients can update their UI
      io.to(message.conversationId.toString()).emit('message_deleted', {
        messageId,
        deleteForEveryone: true,
        text: message.text,
        isDeletedForEveryone: true
      });
    } else {
      // Only notify the user who deleted it
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
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name photos', model: 'User' }
      });

    // Filter out messages deleted for this user and add SAS tokens
    const processedMessages = messages.filter(msg => {
      if (msg.isDeletedForEveryone) return true; // Show "deleted" placeholder
      if (msg.deletedFor.get(userId.toString())) return false;
      return true;
    }).map(msg => {
      const msgObj = msg.toObject();
      if (msgObj.media && msgObj.media.mediaId) {
        // console.log(`[Chat] Generating SAS for message ${msgObj._id}, mediaId: ${msgObj.media.mediaId}`);
        if (msgObj.messageType === 'image') {
          msgObj.media.imageUrl = getFileUrl(msgObj.media.mediaId);
        } else if (msgObj.messageType === 'audio') {
          msgObj.media.audioUrl = getFileUrl(msgObj.media.mediaId);
        }
      }
      return msgObj;
    });

    res.json(processedMessages.reverse());
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
        populate: [
          { path: 'sender', select: 'name photos', model: 'User' },
          { path: 'replyTo', model: 'Message', populate: { path: 'sender', select: 'name photos', model: 'User' } }
        ]
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
        if (validConversations[0].lastMessage) {
          console.log('Sample lastMessage type:', typeof validConversations[0].lastMessage);
          console.log('Sample lastMessage value:', validConversations[0].lastMessage);
        } else {
          console.log('Sample lastMessage is null/undefined');
        }
      }
    }

    // Sanitize lastMessage: if population failed, it might be an ID. Ensure it's null in that case.
    const sanitizedConversations = validConversations.map(conv => {
      const convObj = conv.toObject ? conv.toObject() : conv;
      // Check if lastMessage is a populated object (must have _id property)
      // If it's just an ID (string or ObjectId), it won't have an _id property.
      if (convObj.lastMessage && !convObj.lastMessage._id) {
        console.warn(`[Chat] lastMessage population failed for conv ${convObj._id}, setting to null. Value type: ${typeof convObj.lastMessage}`);
        convObj.lastMessage = null;
      }
      return convObj;
    });

    res.json(sanitizedConversations);
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
        populate: [
          { path: 'sender', select: 'name photos', model: 'User' },
          { path: 'replyTo', model: 'Message', populate: { path: 'sender', select: 'name photos', model: 'User' } }
        ]
      });

      // Sanitize lastMessage if population failed
      const convObj = existingConversation.toObject();
      if (convObj.lastMessage && !convObj.lastMessage._id) {
        convObj.lastMessage = null;
      }

      return res.json(convObj);
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
