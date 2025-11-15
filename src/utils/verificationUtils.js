import crypto from 'crypto';

/**
 * Generate a random 6-digit verification code
 */
export const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate verification code expiry time (default 2 minutes)
 */
export const generateCodeExpiry = (minutes = 2) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if verification code has expired
 */
export const isCodeExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Generate random token for password reset (32 bytes hex)
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash reset token for database storage
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate reset token expiry (default 1 hour)
 */
export const generateResetTokenExpiry = (hours = 1) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};
