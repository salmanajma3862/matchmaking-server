import express from 'express';
import swipeController from '../controllers/swipeController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Record a swipe (like/dislike/superlike)
router.post('/', authenticate, swipeController.createSwipe);

// Undo a swipe (Unsend request)
router.post('/undo', authenticate, swipeController.undoSwipe);

// Unmatch a user
router.post('/unmatch', authenticate, swipeController.unmatchUser);

// Get sent swipes (likes sent)
router.get('/sent', authenticate, swipeController.getSentSwipes);

// Get received swipes (likes received)
router.get('/received', authenticate, swipeController.getReceivedSwipes);

// Get matches
router.get('/matches', authenticate, swipeController.getMatches);

export default router;
