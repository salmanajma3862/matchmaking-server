import express from 'express';
import { registerPushToken, unregisterPushToken } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// Register device for push notifications
router.post('/register', registerPushToken);

// Unregister device from push notifications
router.delete('/unregister', unregisterPushToken);

export default router;
