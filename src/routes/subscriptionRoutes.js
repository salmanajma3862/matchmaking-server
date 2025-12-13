import express from 'express';
import { verifyPurchase } from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/verify', authenticate, verifyPurchase);
export default router;
