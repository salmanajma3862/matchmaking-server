import express from 'express';
import userController from '../controllers/userController.js';
import { authenticate, requireEmailVerification } from '../middleware/authMiddleware.js';
import { uploadProfileData } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Complete profile after email verification (with photos and selfie upload)
router.post(
  '/complete-profile',
  authenticate,
  requireEmailVerification,
  uploadProfileData,
  userController.completeProfile
);

// Get recommended users feed
router.get('/feed', authenticate, userController.getFeed);

// Profile View Tracking (Premium Features)
// Get list of users who viewed my profile
router.get('/profile/viewers', authenticate, userController.getProfileViewers);

// Get list of profiles I have viewed
router.get('/profile/viewed', authenticate, userController.getViewedProfiles);

// Get user profile by ID
router.get('/profile/:userId', authenticate, userController.getUserProfile);

// Update user profile
router.put('/profile', authenticate, userController.updateProfile);

// Delete user account (soft delete)
router.delete('/account', authenticate, userController.deleteAccount);

export default router;
