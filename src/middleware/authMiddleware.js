import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware to verify JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    // Check if user is deleted
    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deleted.',
      });
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked.',
      });
    }

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }

    console.error('❌ Authentication middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

/**
 * Middleware to check if email is verified
 */
export const requireEmailVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource.',
        requiresVerification: true,
      });
    }

    next();
  } catch (error) {
    console.error('❌ Email verification check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Verification check failed.',
    });
  }
};

/**
 * Middleware to check if onboarding is completed
 */
export const requireOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your profile setup first.',
        requiresOnboarding: true,
        currentStep: user.onboardingStep,
      });
    }

    next();
  } catch (error) {
    console.error('❌ Onboarding check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Onboarding check failed.',
    });
  }
};
