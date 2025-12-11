import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import { sendNewMatchNotification } from '../services/notificationService.js';

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
      let swipe = await Swipe.findOne({
        swiper: currentUserId,
        target: targetUserId,
      });

      if (swipe) {
        // If swipe exists, update it
        swipe.action = action;
        await swipe.save();
      } else {
        // Create new swipe
        swipe = new Swipe({
          swiper: currentUserId,
          target: targetUserId,
          action,
          uniqueSwipeId: `${currentUserId}_${targetUserId}`,
        });
        await swipe.save();
      }

      let isMatch = false;
      let matchData = null;

      // If action is like or superlike, check for a match
      if (action === 'like' || action === 'superlike') {
        console.log(`🔍 Checking for reciprocal swipe from ${targetUserId}...`);
        const reciprocalSwipe = await Swipe.findOne({
          swiper: targetUserId,
          target: currentUserId,
          action: { $in: ['like', 'superlike'] },
        });

        if (reciprocalSwipe) {
          console.log(`✨ Reciprocal swipe found! Action: ${reciprocalSwipe.action}`);
          isMatch = true;

          // Ensure consistent ordering for userA/userB to prevent duplicates
          const [userA, userB] = [currentUserId, targetUserId].sort();

          // Check if match already exists
          let match = await Match.findOne({ userA, userB });

          if (!match) {
            // Create a Match record
            match = new Match({
              userA,
              userB,
              uniquePairId: `${userA}_${userB}`,
              status: 'matched',
              matchType: action === 'superlike' || reciprocalSwipe.action === 'superlike' ? 'super_match' : 'normal',
              matchedAt: new Date()
            });

            await match.save();
            console.log(`🎉 It's a match! Users: ${currentUserId} & ${targetUserId}`);

            // Create a Conversation for the new match
            try {
              const existingConv = await Conversation.findOne({
                participants: { $all: [userA, userB] },
                isOneToOne: true
              });

              if (!existingConv) {
                const newConv = new Conversation({
                  participants: [userA, userB],
                  isOneToOne: true,
                  unreadCount: new Map([[userA.toString(), 0], [userB.toString(), 0]])
                });
                await newConv.save();
                console.log(`💬 Conversation created for match: ${newConv._id}`);
              } else {
                console.log(`💬 Conversation already exists: ${existingConv._id}`);
              }
            } catch (convError) {
              console.error('❌ Error creating conversation for match:', convError);
            }

            // Increment totalMatches for both users
            console.log(`📈 Incrementing totalMatches for ${userA} and ${userB}`);
            const updateA = await User.findByIdAndUpdate(userA, { $inc: { totalMatches: 1 } }, { new: true });
            const updateB = await User.findByIdAndUpdate(userB, { $inc: { totalMatches: 1 } }, { new: true });
            console.log(`✅ User A (${userA}) totalMatches: ${updateA?.totalMatches}`);
            console.log(`✅ User B (${userB}) totalMatches: ${updateB?.totalMatches}`);

            // Send push notifications to both users about the new match
            try {
              sendNewMatchNotification(userA, updateB?.name || 'Someone', match._id.toString());
              sendNewMatchNotification(userB, updateA?.name || 'Someone', match._id.toString());
              console.log(`🔔 Push notifications sent for match ${match._id}`);
            } catch (notifError) {
              console.error('❌ Error sending match notifications:', notifError);
            }

          } else {
            console.log(`⚠️ Match already exists for ${userA} & ${userB}`);
            // If match exists but was unmatched/blocked, maybe reactivate?
            // For now, just return the existing match
            if (match.status !== 'matched') {
              console.log(`🔄 Reactivating match (previous status: ${match.status})`);
              match.status = 'matched';
              match.matchedAt = new Date();
              await match.save();
            }
          }

          matchData = match;
        } else {
          console.log(`⏳ No reciprocal swipe found yet.`);
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
        message: 'Server error while recording swipe',
        error: error.message,
      });
    }
  }

  /**
   * UNDO SWIPE (Unsend Request)
   * Allows a user to undo their last swipe on a specific user
   * Only works if it hasn't resulted in a match yet (or business logic decides)
   */
  async undoSwipe(req, res) {
    try {
      const { targetUserId } = req.body;
      const currentUserId = req.user.userId;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Target user ID is required',
        });
      }

      // Check if a match already exists
      const existingMatch = await Match.findOne({
        $or: [
          { userA: currentUserId, userB: targetUserId },
          { userA: targetUserId, userB: currentUserId }
        ]
      });

      if (existingMatch) {
        return res.status(400).json({
          success: false,
          message: 'Cannot undo swipe because you are already matched. Use unmatch instead.',
        });
      }

      // Find and delete the swipe
      const deletedSwipe = await Swipe.findOneAndDelete({
        swiper: currentUserId,
        target: targetUserId,
      });

      if (!deletedSwipe) {
        return res.status(404).json({
          success: false,
          message: 'Swipe not found to undo',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Swipe undone successfully',
      });

    } catch (error) {
      console.error('❌ Undo swipe error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Server error while undoing swipe',
        error: error.message,
      });
    }
  }

  /**
   * UNMATCH USER
   * Removes the match and the swipes between two users
   */
  async unmatchUser(req, res) {
    try {
      const { targetUserId } = req.body;
      const currentUserId = req.user.userId;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Target user ID is required',
        });
      }

      // Find the match
      const match = await Match.findOne({
        $or: [
          { userA: currentUserId, userB: targetUserId },
          { userA: targetUserId, userB: currentUserId }
        ]
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found',
        });
      }

      // Delete the match
      await Match.findByIdAndDelete(match._id);

      // Delete the swipes from both sides to prevent immediate rematch
      // Or we could keep them and add a "blocked" flag, but deleting is simpler for now
      await Swipe.deleteMany({
        $or: [
          { swiper: currentUserId, target: targetUserId },
          { swiper: targetUserId, target: currentUserId },
        ],
      });

      res.status(200).json({
        success: true,
        message: 'Unmatched successfully',
      });

    } catch (error) {
      console.error('❌ Unmatch error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Server error while unmatching',
        error: error.message,
      });
    }
  }

  /**
   * GET SENT SWIPES
   * Returns a list of users the current user has liked, excluding matches
   */
  async getSentSwipes(req, res) {
    try {
      const currentUserId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      // Get list of matched user IDs to exclude
      const matches = await Match.find({
        $or: [{ userA: currentUserId }, { userB: currentUserId }],
        status: 'matched',
      });

      const matchedUserIds = matches.map(m =>
        m.userA.toString() === currentUserId ? m.userB.toString() : m.userA.toString()
      );

      const swipes = await Swipe.find({
        swiper: currentUserId,
        action: { $in: ['like', 'superlike'] },
        target: { $nin: matchedUserIds }
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('target', 'name photos dob city country');

      res.status(200).json({
        success: true,
        data: swipes,
        page,
        limit,
      });

    } catch (error) {
      console.error('❌ Get sent swipes error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sent swipes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET RECEIVED SWIPES
   * Returns a list of users who have liked the current user, excluding matches
   */
  async getReceivedSwipes(req, res) {
    try {
      const currentUserId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      // Get list of matched user IDs to exclude
      const matches = await Match.find({
        $or: [{ userA: currentUserId }, { userB: currentUserId }],
        status: 'matched',
      });

      const matchedUserIds = matches.map(m =>
        m.userA.toString() === currentUserId ? m.userB.toString() : m.userA.toString()
      );

      const swipes = await Swipe.find({
        target: currentUserId,
        action: { $in: ['like', 'superlike'] },
        swiper: { $nin: matchedUserIds }
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('swiper', 'name photos dob city country');

      res.status(200).json({
        success: true,
        data: swipes,
        page,
        limit,
      });

    } catch (error) {
      console.error('❌ Get received swipes error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch received swipes',
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
        $or: [{ userA: currentUserId }, { userB: currentUserId }],
        status: 'matched',
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userA', 'name photos isOnline lastSeen dob city country')
        .populate('userB', 'name photos isOnline lastSeen dob city country');

      // Format the response to return a clean list of matched profiles
      const formattedMatches = matches.map(match => {
        const isUserA = match.userA._id.toString() === currentUserId;
        const otherUser = isUserA ? match.userB : match.userA;

        return {
          matchId: match._id,
          matchedAt: match.createdAt,
          user: otherUser,
          // lastMessage: match.lastMessage, // Not in schema yet
          // unreadCount: match.unreadCount?.get(currentUserId) || 0 // Not in schema yet
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
