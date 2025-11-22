import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import emailService from '../services/emailService.js';
import {
  generateVerificationCode,
  generateCodeExpiry,
  isCodeExpired,
  generateResetToken,
  hashToken,
  generateResetTokenExpiry,
} from '../utils/verificationUtils.js';

class AuthController {
  /**
   * SIGNUP - Register new user with email and password ONLY
   * Generates 6-digit verification code valid for 2 minutes
   * Other details (name, phone, gender, etc.) will be collected in completeProfile step
   */
  async signup(req, res) {
    try {
      const { email, password } = req.body;

      console.log('📝 Signup request received for:', email);

      // Validation - Only email and password required
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        console.log('❌ Email already registered:', email);
        return res.status(409).json({
          success: false,
          message: 'Email already registered. Please login or use forgot password.',
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiry = generateCodeExpiry(2);

      console.log('🔐 Generated verification code for:', email);

      // Create user with minimal information
      const newUser = await User.create({
        email: email.toLowerCase(),
        passwordHash,
        name: 'User', // Temporary name, will be updated in completeProfile
        phone: `temp_${Date.now()}`, // Temporary phone, will be updated in completeProfile
        gender: 'male', // Temporary, will be updated in completeProfile
        dob: new Date('2000-01-01'), // Temporary, will be updated in completeProfile
        verificationCode,
        verificationCodeExpiry,
        isEmailVerified: false,
        onboardingStep: 1,
        onboardingCompleted: false,
      });

      console.log('✅ User created successfully:', newUser._id);

      // Send verification email
      try {
        await emailService.sendVerificationEmail(email, 'User', verificationCode);
        console.log('✅ Verification email sent to:', email);
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', emailError.message);
        // Don't fail the signup if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Signup successful! Please check your email for verification code.',
        user: newUser, // Required for Android App AuthRepository
        data: {
          userId: newUser._id,
          email: newUser.email,
          isEmailVerified: false,
          codeExpiresIn: '2 minutes',
        },
      });
    } catch (error) {
      console.error('❌ Signup error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred during signup. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * VERIFY EMAIL - Verify user email with 6-digit code
   */
  async verifyEmail(req, res) {
    try {
      // Accept both 'code' (from Android) and 'verificationCode' (legacy/web)
      const { email, verificationCode, code } = req.body;
      const codeToVerify = verificationCode || code;

      console.log('🔍 Email verification attempt for:', email);

      // Validation
      if (!email || !codeToVerify) {
        return res.status(400).json({
          success: false,
          message: 'Email and verification code are required',
        });
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified',
        });
      }

      // Check if code exists
      if (!user.verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'No verification code found. Please request a new one.',
        });
      }

      // Check if code expired
      if (isCodeExpired(user.verificationCodeExpiry)) {
        console.log('⏰ Verification code expired for:', email);
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.',
        });
      }

      // Verify code
      if (user.verificationCode !== codeToVerify) {
        console.log('❌ Invalid verification code for:', email);
        
        // Increment failed OTP attempts
        user.failedOtpAttempts = (user.failedOtpAttempts || 0) + 1;
        
        // Lock account after max attempts
        const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
        if (user.failedOtpAttempts >= maxAttempts) {
          const lockTime = parseInt(process.env.ACCOUNT_LOCK_TIME) || 15;
          user.accountLockedUntil = new Date(Date.now() + lockTime * 60 * 1000);
          await user.save();
          
          console.log('🔒 Account locked due to too many failed attempts:', email);
          return res.status(429).json({
            success: false,
            message: `Too many failed attempts. Account locked for ${lockTime} minutes.`,
          });
        }
        
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
          attemptsRemaining: maxAttempts - user.failedOtpAttempts,
        });
      }

      // Verify successful - update user
      user.isEmailVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpiry = null;
      user.failedOtpAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();

      console.log('✅ Email verified successfully for:', email);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(email, user.name);
      } catch (emailError) {
        console.error('⚠️ Failed to send welcome email:', emailError.message);
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
        isVerified: true, // Required for Android App AuthRepository
        token, // Useful if we update app to save token
        user, // Useful if we update app to save user
        data: {
          userId: user._id,
          email: user.email,
          name: user.name,
          isEmailVerified: Boolean(true),
          token,
        },
      });
    } catch (error) {
      console.error('❌ Email verification error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred during verification. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * RESEND VERIFICATION CODE - Generate and send new verification code
   */
  async resendVerificationCode(req, res) {
    try {
      const { email } = req.body;

      console.log('🔄 Resend verification code request for:', email);

      // Validation
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified',
        });
      }

      // Check if account is locked
      if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
        const remainingMinutes = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
        return res.status(429).json({
          success: false,
          message: `Account is locked. Please try again in ${remainingMinutes} minutes.`,
        });
      }

      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiry = generateCodeExpiry(2);

      user.verificationCode = verificationCode;
      user.verificationCodeExpiry = verificationCodeExpiry;
      user.failedOtpAttempts = 0;
      await user.save();

      console.log('🔐 New verification code generated for:', email);

      // Send verification email
      try {
        await emailService.resendVerificationEmail(email, user.name, verificationCode);
        console.log('✅ Verification code resent to:', email);
      } catch (emailError) {
        console.error('❌ Failed to resend verification email:', emailError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully!',
        data: {
          email: user.email,
          codeExpiresIn: '2 minutes',
        },
      });
    } catch (error) {
      console.error('❌ Resend verification code error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * LOGIN - Authenticate user with email and password
   * Tracks login time, IP, and location
   * Sends security alert on failed attempts
   */
  async login(req, res) {
    try {
      const { email, password, deviceType, latitude, longitude } = req.body;

      console.log('🔐 Login attempt for:', email);

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if account is deleted
      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: 'This account has been deleted',
        });
      }

      // Check if account is locked
      if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
        const remainingMinutes = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
        return res.status(429).json({
          success: false,
          message: `Account is locked due to too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        console.log('❌ Invalid password for:', email);

        // Increment login attempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;

        // Lock account after max attempts
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
        if (user.loginAttempts >= maxAttempts) {
          const lockTime = parseInt(process.env.ACCOUNT_LOCK_TIME) || 15;
          user.accountLockedUntil = new Date(Date.now() + lockTime * 60 * 1000);
          await user.save();

          console.log('🔒 Account locked due to too many failed login attempts:', email);

          // Send security alert email
          try {
            const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
            await emailService.sendFailedLoginAlert(
              email,
              user.name,
              ipAddress,
              new Date(),
              'Pakistan'
            );
          } catch (emailError) {
            console.error('⚠️ Failed to send security alert:', emailError.message);
          }

          return res.status(429).json({
            success: false,
            message: `Too many failed login attempts. Account locked for ${lockTime} minutes.`,
          });
        }

        await user.save();

        // Send failed login alert after 3 attempts
        if (user.loginAttempts >= 3) {
          try {
            const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
            await emailService.sendFailedLoginAlert(
              email,
              user.name,
              ipAddress,
              new Date(),
              'Pakistan'
            );
          } catch (emailError) {
            console.error('⚠️ Failed to send security alert:', emailError.message);
          }
        }

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          attemptsRemaining: maxAttempts - user.loginAttempts,
        });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        console.log('⚠️ Email not verified for:', email);

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationCodeExpiry = generateCodeExpiry(2);

        user.verificationCode = verificationCode;
        user.verificationCodeExpiry = verificationCodeExpiry;
        await user.save();

        // Send verification email
        try {
          // Use resendVerificationEmail or sendVerificationEmail depending on what's available/appropriate
          // Assuming resendVerificationEmail is appropriate here as it's a subsequent attempt
          await emailService.resendVerificationEmail(email, user.name, verificationCode);
          console.log('✅ Verification code sent to:', email);
        } catch (emailError) {
          console.error('⚠️ Failed to send verification email:', emailError.message);
        }

        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in. A new verification code has been sent.',
          requiresVerification: true,
        });
      }

      // Login successful - update user
      const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
      const sessionId = jwt.sign({ userId: user._id, timestamp: Date.now() }, process.env.JWT_SECRET);

      user.lastLoginAt = new Date();
      user.lastLoginIp = ipAddress;
      user.loginAttempts = 0;
      user.accountLockedUntil = null;
      user.isOnline = true;
      user.lastActive = new Date();
      user.lastSessionId = user.currentSessionId;
      user.currentSessionId = sessionId;

      // Update device info if provided
      if (deviceType) {
        user.deviceType = deviceType;
      }

      // Update location if provided
      if (latitude && longitude) {
        user.currentLocation = {
          lat: latitude,
          lng: longitude,
          lastUpdated: new Date(),
        };
        user.lastLoginLocation = `${latitude}, ${longitude}`;
      }

      // Add to session history
      user.sessionHistory.push({
        device: deviceType || 'Unknown',
        location: user.lastLoginLocation || 'Unknown',
        time: new Date(),
      });

      // Keep only last 10 sessions
      if (user.sessionHistory.length > 10) {
        user.sessionHistory = user.sessionHistory.slice(-10);
      }

      await user.save();

      console.log('✅ Login successful for:', email);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful!',
        token, // Required for Android App AuthRepository
        user, // Required for Android App AuthRepository
        data: {
          userId: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          isEmailVerified: Boolean(user.isEmailVerified),
          onboardingCompleted: Boolean(user.onboardingCompleted),
          token,
        },
      });
    } catch (error) {
      console.error('❌ Login error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred during login. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * FORGOT PASSWORD - Send password reset link to user's email
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      console.log('🔑 Forgot password request for:', email);

      // Validation
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });

      // Don't reveal if user exists or not (security)
      if (!user) {
        console.log('⚠️ User not found for forgot password:', email);
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link.',
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const hashedToken = hashToken(resetToken);

      user.passwordResetToken = hashedToken;
      user.passwordResetExpiry = generateResetTokenExpiry(1);
      await user.save();

      console.log('🔐 Password reset token generated for:', email);

      // Send reset email
      try {
        await emailService.sendForgotPasswordEmail(email, user.name, resetToken);
        console.log('✅ Password reset email sent to:', email);
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError.message);
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save();

        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email. Please try again.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    } catch (error) {
      console.error('❌ Forgot password error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * RESET PASSWORD - Reset user password with valid token
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      console.log('🔑 Password reset attempt with token');

      // Validation
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
      }

      // Password strength validation
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Hash the token to compare with database
      const hashedToken = hashToken(token);

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpiry: { $gt: Date.now() },
      });

      if (!user) {
        console.log('❌ Invalid or expired reset token');
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      user.passwordHash = passwordHash;
      user.passwordResetToken = null;
      user.passwordResetExpiry = null;
      user.loginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();

      console.log('✅ Password reset successful for:', user.email);

      res.status(200).json({
        success: true,
        message: 'Password reset successful! You can now login with your new password.',
      });
    } catch (error) {
      console.error('❌ Reset password error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * LOGOUT - Log out user and update status
   */
  async logout(req, res) {
    try {
      const { userId } = req.body;

      console.log('👋 Logout request for user:', userId);

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      // Find user and update status
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      user.isOnline = false;
      user.lastSeen = new Date();
      user.socketId = null;
      user.lastSessionId = user.currentSessionId;
      user.currentSessionId = null;
      await user.save();

      console.log('✅ User logged out successfully:', userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred during logout',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET CURRENT USER - Get authenticated user's profile
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await User.findById(userId).select('-passwordHash -verificationCode -passwordResetToken').lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Ensure all boolean fields are actual booleans, not strings
      const sanitizedUser = {
        ...user,
        isEmailVerified: Boolean(user.isEmailVerified),
        isDeleted: Boolean(user.isDeleted),
        isOnline: Boolean(user.isOnline),
        onboardingCompleted: Boolean(user.onboardingCompleted),
        smoking: user.smoking !== undefined ? Boolean(user.smoking) : false,
        drinking: user.drinking !== undefined ? Boolean(user.drinking) : false,
        livingWithFamily: user.livingWithFamily !== undefined ? Boolean(user.livingWithFamily) : false,
        isVerified: Boolean(user.isVerified),
        notificationsEnabled: Boolean(user.notificationsEnabled),
        messageNotifications: Boolean(user.messageNotifications),
        matchNotifications: Boolean(user.matchNotifications),
        familyApprovalNotifications: Boolean(user.familyApprovalNotifications),
        marketingNotifications: Boolean(user.marketingNotifications),
        hasSeenIntroScreens: Boolean(user.hasSeenIntroScreens),
        needsProfileUpdate: Boolean(user.needsProfileUpdate),
      };

      // Sanitize photos array
      if (sanitizedUser.photos && Array.isArray(sanitizedUser.photos)) {
        sanitizedUser.photos = sanitizedUser.photos.map(photo => ({
          ...photo,
          isPrimary: Boolean(photo.isPrimary),
        }));
      }

      // Sanitize familyMode if present
      if (sanitizedUser.familyMode && sanitizedUser.familyMode.enabled !== undefined) {
        sanitizedUser.familyMode = {
          ...sanitizedUser.familyMode,
          enabled: Boolean(sanitizedUser.familyMode.enabled),
        };
      }

      // Sanitize privacySettings if present
      if (sanitizedUser.privacySettings) {
        sanitizedUser.privacySettings = {
          hideLastSeen: Boolean(sanitizedUser.privacySettings.hideLastSeen),
          hideProfilePhoto: Boolean(sanitizedUser.privacySettings.hideProfilePhoto),
          hideOnlineStatus: Boolean(sanitizedUser.privacySettings.hideOnlineStatus),
          blockStrangersFromMessaging: Boolean(sanitizedUser.privacySettings.blockStrangersFromMessaging),
        };
      }

      // Sanitize moderation if present
      if (sanitizedUser.moderation) {
        sanitizedUser.moderation = {
          ...sanitizedUser.moderation,
          autoBlurEnabled: Boolean(sanitizedUser.moderation.autoBlurEnabled),
          shadowBanStatus: Boolean(sanitizedUser.moderation.shadowBanStatus),
        };
      }

      res.status(200).json({
        success: true,
        data: sanitizedUser,
      });
    } catch (error) {
      console.error('❌ Get current user error:', error.message);
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default new AuthController();
