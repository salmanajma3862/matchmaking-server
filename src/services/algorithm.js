import User from '../models/User.js';
import Swipe from '../models/Swipe.js';

/**
 * Get recommended users for the feed.
 * 
 * Algorithm Logic:
 * 1. Identify current user's gender and preferences.
 * 2. Exclude users already swiped (liked/disliked) by the current user.
 * 3. Filter by opposite gender (Male -> Female, Female -> Male).
 * 4. (Optional) Prioritize users in the same city or with similar interests.
 * 5. Paginate results (10 per page).
 * 
 * @param {string} currentUserId - The ID of the user requesting the feed.
 * @param {number} page - The page number for pagination (default 1).
 * @param {number} limit - The number of users to return per page (default 10).
 * @returns {Promise<Array>} - List of recommended user profiles.
 */
export const getRecommendedUsers = async (currentUserId, page = 1, limit = 10) => {
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

    // 2. Build the query
    const query = {
      _id: { $nin: [...swipedUserIds, currentUserId] }, // Exclude swiped and self
      gender: targetGender,
      isDeleted: false,
      // Ensure we only show users who have completed basic profile setup if applicable
      // onboardingCompleted: true // Uncomment if this field exists and is required
    };

    // 3. Fetch users with pagination
    // We can use aggregation to add a "score" for sorting, or just simple find.
    // Let's use a simple find for now, but we could sort by "lastActive" or "city" match.
    
    // Simple Algorithm: Prioritize same city, then random/recent
    // Since MongoDB doesn't support custom scoring easily in simple find without aggregation,
    // we will use aggregation to implement a basic recommendation score.

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
