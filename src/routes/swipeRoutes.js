import express from 'express';
import swipeController from '../controllers/swipeController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Record a swipe (like/dislike/superlike)
router.post('/', authenticate, swipeController.createSwipe);

// Get matches
router.get('/matches', authenticate, swipeController.getMatches);

export default router;
