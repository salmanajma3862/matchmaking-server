import express from 'express';
import {
  sendMessage,
  editMessage,
  deleteMessage,
  getMessages,
  getConversations,
  createConversation,
  markAsRead
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/authMiddleware.js';

import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticate); // Protect all chat routes

router.post('/send', upload.single('image'), sendMessage);
router.put('/edit/:messageId', editMessage);
router.delete('/delete/:messageId', deleteMessage);
router.get('/messages/:conversationId', getMessages);
router.get('/conversations', getConversations);
router.post('/conversation', createConversation);
router.post('/read', markAsRead);

export default router;
