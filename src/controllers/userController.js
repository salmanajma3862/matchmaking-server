import User from '../models/User.js';
import Verification from '../models/Verification.js';
import cloudinary from '../config/cloudinary.js';

/**
 * Sanitize user data to ensure all boolean fields are actual booleans
 * This prevents "Cannot cast string to boolean" errors in React Native
 */
const sanitizeUserData = (user) => {
  if (!user) return null;
  
  const userObj = user.toObject ? user.toObject() : user;
  
  return {
    ...userObj,
    // Core boolean fields
    isEmailVerified: Boolean(userObj.isEmailVerified),
    isDeleted: Boolean(userObj.isDeleted),
    isOnline: Boolean(userObj.isOnline),
    onboardingCompleted: Boolean(userObj.onboardingCompleted),
    isVerified: Boolean(userObj.isVerified),
    
    // Optional boolean fields
    smoking: userObj.smoking !== undefined ? Boolean(userObj.smoking) : false,
    drinking: userObj.drinking !== undefined ? Boolean(userObj.drinking) : false,
    livingWithFamily: userObj.livingWithFamily !== undefined ? Boolean(userObj.livingWithFamily) : false,
    
    // Notification boolean fields
    notificationsEnabled: Boolean(userObj.notificationsEnabled),
    messageNotifications: Boolean(userObj.messageNotifications),
    matchNotifications: Boolean(userObj.matchNotifications),
    familyApprovalNotifications: Boolean(userObj.familyApprovalNotifications),
    marketingNotifications: Boolean(userObj.marketingNotifications),
    
    // Onboarding boolean fields
    hasSeenIntroScreens: Boolean(userObj.hasSeenIntroScreens),
    needsProfileUpdate: Boolean(userObj.needsProfileUpdate),
    
    // Sanitize photos array
    photos: userObj.photos && Array.isArray(userObj.photos) 
      ? userObj.photos.map(photo => ({
          ...photo,
          isPrimary: Boolean(photo.isPrimary || false),
        }))
      : [],
    
    // Sanitize nested objects
    familyMode: userObj.familyMode ? {
      ...userObj.familyMode,
      enabled: Boolean(userObj.familyMode.enabled),
    } : undefined,
    
    privacySettings: userObj.privacySettings ? {
      hideLastSeen: Boolean(userObj.privacySettings.hideLastSeen),
      hideProfilePhoto: Boolean(userObj.privacySettings.hideProfilePhoto),
      hideOnlineStatus: Boolean(userObj.privacySettings.hideOnlineStatus),
      blockStrangersFromMessaging: Boolean(userObj.privacySettings.blockStrangersFromMessaging),
    } : undefined,
    
    moderation: userObj.moderation ? {
      ...userObj.moderation,
      autoBlurEnabled: Boolean(userObj.moderation.autoBlurEnabled),
      shadowBanStatus: Boolean(userObj.moderation.shadowBanStatus),
    } : undefined,
  };
};

class UserController {
  /**
   * COMPLETE PROFILE - Handle all user information in one request
   * This is called after email verification
   * Handles: personal info, photos, verification selfie, preferences, location
   */
  async completeProfile(req, res) {
    try {
      const userId = req.user.userId;
      console.log('📝 Complete profile request for user:', userId);

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email first',
        });
      }

      // Parse JSON data from request body
      const {
        // Personal Information
        bio,
        height,
        weight,
        bodyType,
        city,
        country,
        address,
        religion,
        sect,
        maritalStatus,
        education,
        profession,
        incomeRange,

        // Life habits
        smoking,
        drinking,
        dietPreference,

        // Interests and Hobbies
        interests,
        hobbies,

        // Family details
        familyBackground,
        numberOfSiblings,
        livingWithFamily,

        // User intention
        intention,
        readyForMarriageTimeframe,

        // Preferences (for matchmaking)
        preferences,

        // Location coordinates
        latitude,
        longitude,
      } = req.body;

      console.log('📄 Received profile data for:', user.name);

      // Validation - Check required fields
      if (!city || !country) {
        return res.status(400).json({
          success: false,
          message: 'City and country are required',
        });
      }

      // Handle file uploads (photos and selfie)
      const uploadedPhotos = [];
      const files = req.files;

      console.log('📸 Processing uploaded files...');

      // Upload profile photos to Cloudinary
      if (files && files.photos && files.photos.length > 0) {
        console.log(`📷 Uploading ${files.photos.length} profile photos...`);

        for (const photo of files.photos) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'matchmaking/profile-photos',
                  transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
                  public_id: `user_${userId}_photo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              uploadStream.end(photo.buffer);
            });

            uploadedPhotos.push({
              url: result.secure_url,
              isPrimary: uploadedPhotos.length === 0, // First photo is primary
            });

            console.log('✅ Photo uploaded:', result.secure_url);
          } catch (uploadError) {
            console.error('❌ Photo upload failed:', uploadError.message);
          }
        }
      }

      // Check if at least one photo was uploaded
      if (uploadedPhotos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one profile photo is required',
        });
      }

      // Handle verification selfie
      let selfieUrl = null;
      if (files && files.selfie && files.selfie.length > 0) {
        console.log('🤳 Uploading verification selfie...');

        try {
          const selfie = files.selfie[0];
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'matchmaking/verification-selfies',
                transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
                public_id: `user_${userId}_selfie_${Date.now()}`,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(selfie.buffer);
          });

          selfieUrl = result.secure_url;
          console.log('✅ Selfie uploaded:', selfieUrl);

          // Create or update verification record
          const verificationData = {
            user: userId,
            selfieImageUrl: selfieUrl,
            status: 'pending',
            submittedAt: new Date(),
          };

          await Verification.findOneAndUpdate(
            { user: userId },
            verificationData,
            { upsert: true, new: true }
          );

          console.log('✅ Verification record created/updated');
        } catch (uploadError) {
          console.error('❌ Selfie upload failed:', uploadError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload verification selfie',
          });
        }
      }

      // Parse preferences if provided as JSON string
      let parsedPreferences = preferences;
      if (typeof preferences === 'string') {
        try {
          parsedPreferences = JSON.parse(preferences);
        } catch (e) {
          console.error('⚠️ Failed to parse preferences:', e.message);
        }
      }

      // Parse arrays if provided as JSON strings
      let parsedInterests = interests;
      if (typeof interests === 'string') {
        try {
          parsedInterests = JSON.parse(interests);
        } catch (e) {
          parsedInterests = interests.split(',').map(i => i.trim());
        }
      }

      let parsedHobbies = hobbies;
      if (typeof hobbies === 'string') {
        try {
          parsedHobbies = JSON.parse(hobbies);
        } catch (e) {
          parsedHobbies = hobbies.split(',').map(h => h.trim());
        }
      }

      // Update user profile with all information
      const updateData = {
        // Personal Information
        ...(bio && { bio }),
        ...(height && { height: parseFloat(height) }),
        ...(weight && { weight: parseFloat(weight) }),
        ...(bodyType && { bodyType }),
        ...(city && { city }),
        ...(country && { country }),
        ...(address && { address }),
        ...(religion && { religion }),
        ...(sect && { sect }),
        ...(maritalStatus && { maritalStatus }),
        ...(education && { education }),
        ...(profession && { profession }),
        ...(incomeRange && { incomeRange }),

        // Photos
        photos: uploadedPhotos,

        // Life habits
        ...(smoking !== undefined && { smoking: smoking === 'true' || smoking === true }),
        ...(drinking !== undefined && { drinking: drinking === 'true' || drinking === true }),
        ...(dietPreference && { dietPreference }),

        // Interests and Hobbies
        ...(parsedInterests && { interests: parsedInterests }),
        ...(parsedHobbies && { hobbies: parsedHobbies }),

        // Family details
        ...(familyBackground && { familyBackground }),
        ...(numberOfSiblings && { numberOfSiblings: parseInt(numberOfSiblings) }),
        ...(livingWithFamily !== undefined && { 
          livingWithFamily: livingWithFamily === 'true' || livingWithFamily === true 
        }),

        // User intention
        ...(intention && { intention }),
        ...(readyForMarriageTimeframe && { readyForMarriageTimeframe }),

        // Preferences
        ...(parsedPreferences && { preferences: parsedPreferences }),

        // Location
        ...(latitude && longitude && {
          currentLocation: {
            lat: parseFloat(latitude),
            lng: parseFloat(longitude),
            lastUpdated: new Date(),
          },
        }),

        // Onboarding status
        onboardingCompleted: true,
        onboardingStep: 10,
        needsProfileUpdate: false,
      };

      // Calculate profile completeness
      const totalFields = 25;
      const filledFields = Object.keys(updateData).filter(key => {
        const value = updateData[key];
        return value !== null && value !== undefined && value !== '' && 
               !(Array.isArray(value) && value.length === 0);
      }).length;
      
      updateData.profileCompleteness = Math.round((filledFields / totalFields) * 100);

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-passwordHash -verificationCode -passwordResetToken');

      console.log('✅ Profile completed successfully for:', user.name);
      console.log(`📊 Profile completeness: ${updateData.profileCompleteness}%`);

      res.status(200).json({
        success: true,
        message: 'Profile completed successfully!',
        data: {
          user: sanitizeUserData(updatedUser),
          profileCompleteness: updateData.profileCompleteness,
          photosUploaded: uploadedPhotos.length,
          verificationSubmitted: !!selfieUrl,
        },
      });
    } catch (error) {
      console.error('❌ Complete profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to complete profile. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET USER PROFILE - Get user profile by ID
   */
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      console.log('👤 Fetching profile for user:', userId);

      const user = await User.findById(userId)
        .select('-passwordHash -verificationCode -passwordResetToken -loginAttempts')
        .populate('matches.userId', 'name photos city age');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if user is deleted
      if (user.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'User profile not available',
        });
      }

      res.status(200).json({
        success: true,
        data: sanitizeUserData(user),
      });
    } catch (error) {
      console.error('❌ Get user profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * UPDATE USER PROFILE - Update existing user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updates = req.body;

      console.log('📝 Updating profile for user:', userId);

      // Remove fields that shouldn't be updated directly
      delete updates.email;
      delete updates.passwordHash;
      delete updates.phone;
      delete updates._id;
      delete updates.verificationCode;
      delete updates.passwordResetToken;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-passwordHash -verificationCode -passwordResetToken');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      console.log('✅ Profile updated successfully');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: sanitizeUserData(updatedUser),
      });
    } catch (error) {
      console.error('❌ Update profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * DELETE USER ACCOUNT - Soft delete user account
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user.userId;

      console.log('🗑️ Deleting account for user:', userId);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            isDeleted: true,
            isOnline: false,
            deletedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      console.log('✅ Account deleted successfully');

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete account error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default new UserController();
