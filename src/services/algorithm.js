import User from '../models/User.js';
import Swipe from '../models/Swipe.js';

/**
 * Get recommended users for the feed.
 * 
 * Algorithm Logic:
 * 1. Identify current user's gender and preferences.
 * 2. Exclude users already swiped (liked/disliked) by the current user.
 * 3. Filter by opposite gender (Male -> Female, Female -> Male).
 * 4. Apply user-specified filters (age, location, religion, etc.)
 * 5. (Optional) Prioritize users in the same city or with similar interests.
 * 6. Paginate results (10 per page).
 * 
 * @param {string} currentUserId - The ID of the user requesting the feed.
 * @param {number} page - The page number for pagination (default 1).
 * @param {number} limit - The number of users to return per page (default 10).
 * @param {object} filters - Optional filters for the feed.
 * @returns {Promise<Array>} - List of recommended user profiles.
 */
export const getRecommendedUsers = async (currentUserId, page = 1, limit = 10, filters = {}) => {
  try {
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { gender, city, interests } = currentUser;
    const targetGender = gender === 'male' ? 'female' : 'male';

    // 1. Get IDs of users already swiped by the current user
    const swipedUsers = await Swipe.find({ swiper: currentUserId }).select('target').lean();
    const swipedUserIds = swipedUsers.map(swipe => swipe.target);

    // 2. Build the base query
    const query = {
      _id: { $nin: [...swipedUserIds, currentUserId] }, // Exclude swiped and self
      gender: targetGender,
      isDeleted: false,
    };

    // 3. Apply user-specified filters

    // Age filter (using date of birth)
    if (filters.minAge || filters.maxAge) {
      const now = new Date();
      const dateFilters = {};

      if (filters.maxAge) {
        // For max age, we need minimum birth date (born at least X years ago)
        const minBirthDate = new Date(now.getFullYear() - filters.maxAge - 1, now.getMonth(), now.getDate());
        dateFilters.$gte = minBirthDate;
      }

      if (filters.minAge) {
        // For min age, we need maximum birth date (born at most X years ago)
        const maxBirthDate = new Date(now.getFullYear() - filters.minAge, now.getMonth(), now.getDate());
        dateFilters.$lte = maxBirthDate;
      }

      if (Object.keys(dateFilters).length > 0) {
        query.dob = dateFilters;
      }
    }

    // City filter (case-insensitive partial match)
    if (filters.city) {
      query.city = { $regex: filters.city, $options: 'i' };
    }

    // Religion filter (exact match)
    if (filters.religion) {
      query.religion = filters.religion;
    }

    // Marital status filter (can be array)
    if (filters.maritalStatus && filters.maritalStatus.length > 0) {
      query.maritalStatus = { $in: filters.maritalStatus };
    }

    // Education filter
    if (filters.education) {
      query.education = filters.education;
    }

    // Height filter (in cm)
    if (filters.minHeight || filters.maxHeight) {
      const heightFilters = {};
      if (filters.minHeight) {
        heightFilters.$gte = filters.minHeight;
      }
      if (filters.maxHeight) {
        heightFilters.$lte = filters.maxHeight;
      }
      query.height = heightFilters;
    }

    // Smoking filter
    if (filters.smoking !== null && filters.smoking !== undefined) {
      query.smoking = filters.smoking;
    }

    // Drinking filter
    if (filters.drinking !== null && filters.drinking !== undefined) {
      query.drinking = filters.drinking;
    }

    // 4. Build aggregation pipeline with scoring
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          // Simple scoring: 10 points if same city, 0 otherwise
          score: {
            $cond: [{ $eq: ["$city", city] }, 10, 0]
          },
          // Calculate shared interests count (if interests exist)
          sharedInterestsCount: {
            $size: {
              $setIntersection: ["$interests", interests || []]
            }
          }
        }
      },
      {
        $addFields: {
          totalScore: { $add: ["$score", "$sharedInterestsCount"] }
        }
      },
      { $sort: { totalScore: -1, _id: -1 } }, // Sort by score descending
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          passwordHash: 0,
          verificationCode: 0,
          verificationCodeExpiry: 0,
          passwordResetToken: 0,
          passwordResetExpiry: 0,
          // Exclude other sensitive fields
        }
      }
    ];

    const recommendations = await User.aggregate(pipeline);

    return recommendations;

  } catch (error) {
    console.error('Error in getRecommendedUsers algorithm:', error);
    throw error;
  }
};
