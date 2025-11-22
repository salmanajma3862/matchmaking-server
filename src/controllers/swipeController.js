import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import User from '../models/User.js';

class SwipeController {
  /**
   * RECORD SWIPE
   * Handles like, dislike, and superlike actions
   */
  async createSwipe(req, res) {
    try {
      const { targetUserId, action } = req.body;
      const currentUserId = req.user.userId;

      if (!targetUserId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Target user ID and action are required',
        });
      }

      if (!['like', 'dislike', 'superlike'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be like, dislike, or superlike',
        });
      }

      if (currentUserId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot swipe on yourself',
        });
      }

      // Check if swipe already exists
      const existingSwipe = await Swipe.findOne({
        swiper: currentUserId,
        target: targetUserId,
      });

      if (existingSwipe) {
        return res.status(400).json({
          success: false,
          message: 'You have already swiped on this user',
        });
      }

      // Create new swipe
      const swipe = new Swipe({
        swiper: currentUserId,
        target: targetUserId,
        action,
        uniqueSwipeId: `${currentUserId}_${targetUserId}`,
      });

      await swipe.save();

      let isMatch = false;
      let matchData = null;

      // If action is like or superlike, check for a match
      if (action === 'like' || action === 'superlike') {
        const reciprocalSwipe = await Swipe.findOne({
          swiper: targetUserId,
          target: currentUserId,
          action: { $in: ['like', 'superlike'] },
        });

        if (reciprocalSwipe) {
          isMatch = true;
          
          // Create a Match record
          const match = new Match({
            users: [currentUserId, targetUserId],
            matchType: action === 'superlike' || reciprocalSwipe.action === 'superlike' ? 'super_match' : 'normal',
          });
          
          await match.save();
          matchData = match;

          // TODO: Send notification to both users
          console.log(`🎉 It's a match! Users: ${currentUserId} & ${targetUserId}`);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Swipe recorded successfully',
        data: {
          swipe,
          isMatch,
          match: matchData,
        },
      });

    } catch (error) {
      console.error('❌ Create swipe error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to record swipe',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET MATCHES
   * Returns a list of matched users
   */
  async getMatches(req, res) {
    try {
      const currentUserId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const matches = await Match.find({
        users: currentUserId,
        isUnmatched: false,
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'users',
          select: 'name photos isOnline lastSeen', // Select fields to display in match list
          match: { _id: { $ne: currentUserId } } // Only populate the OTHER user
        });

      // Format the response to return a clean list of matched profiles
      const formattedMatches = matches.map(match => {
        const otherUser = match.users.find(u => u._id.toString() !== currentUserId);
        return {
          matchId: match._id,
          matchedAt: match.createdAt,
          user: otherUser,
          lastMessage: match.lastMessage,
          unreadCount: match.unreadCount?.get(currentUserId) || 0
        };
      });

      res.status(200).json({
        success: true,
        data: formattedMatches,
        page,
        limit,
      });

    } catch (error) {
      console.error('❌ Get matches error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch matches',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default new SwipeController();
