import User from "../models/User.js";
import FamilyInvite from "../models/FamilyInvite.js";
import Conversation from "../models/Conversation.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateVerificationCode } from "../utils/verificationUtils.js";

// Helper to generate a random 6-digit alphanumeric code
const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

class FamilyController {
    /**
     * CREATE INVITE - Main user generates an invite code for family
     */
    async createInvite(req, res) {
        try {
            const { scope, durationInHours } = req.body;
            const userId = req.user.userId;

            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            // Default duration: 24 hours
            let duration = durationInHours || 24;

            // Special cases for "1 month" (approx 720 hours) or "lifetime"
            // We'll assume the client sends specific magic numbers or we just handle large values
            // Client might send: 720 (1 month), -1 (lifetime)

            let expiresAt;
            if (duration === -1) {
                // Lifetime: Set to 100 years from now
                expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
            } else {
                expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
            }

            // Generate unique code
            let code = generateInviteCode();
            let isUnique = false;
            while (!isUnique) {
                const existing = await FamilyInvite.findOne({ code });
                if (!existing) isUnique = true;
                else code = generateInviteCode();
            }

            const invite = await FamilyInvite.create({
                code,
                inviterId: userId,
                scope: scope || ["view_matches"], // Default scope
                expiresAt,
            });

            res.status(201).json({
                success: true,
                message: "Invite code generated successfully",
                data: {
                    code: invite.code,
                    expiresAt: invite.expiresAt,
                    scope: invite.scope,
                },
            });
        } catch (error) {
            console.error("❌ Create invite error:", error.message);
            res.status(500).json({ success: false, message: "Failed to generate invite" });
        }
    }

    /**
     * SIGNUP FAMILY - Step 1: Register with Email/Password
     */
    async signupFamily(req, res) {
        try {
            const { email, password, name, relation, relationDetail } = req.body;

            if (!email || !password || !name) {
                return res.status(400).json({ success: false, message: "All fields are required" });
            }

            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({ success: false, message: "Email already registered" });
            }

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const newUser = await User.create({
                email: email.toLowerCase(),
                passwordHash,
                name,
                role: "family_unlinked",
                phone: `family_${Date.now()}`, // Placeholder
                gender: "female", // Default, can be updated
                dob: new Date(), // Default
                isEmailVerified: true, // Auto-verify for simplicity in this flow
                familyMode: {
                    familyRelation: relation,
                    familyRelationDetail: relationDetail
                }
            });

            const token = jwt.sign(
                { userId: newUser._id, email: newUser.email, role: newUser.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.status(201).json({
                success: true,
                message: "Family account created. Please link with invite code.",
                token,
                user: newUser,
            });
        } catch (error) {
            console.error("❌ Family signup error:", error.message);
            res.status(500).json({ success: false, message: "Signup failed" });
        }
    }

    /**
     * LINK FAMILY - Step 2: Enter Invite Code
     */
    async linkFamily(req, res) {
        try {
            const { inviteCode } = req.body;
            const userId = req.user.userId;

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: "User not found" });

            // Check Rate Limit
            if (user.familyInviteRateLimit?.blockUntil && new Date() < user.familyInviteRateLimit.blockUntil) {
                const remaining = Math.ceil((user.familyInviteRateLimit.blockUntil - new Date()) / 60000);
                return res.status(429).json({
                    success: false,
                    message: `Too many failed attempts. Try again in ${remaining} minutes.`,
                });
            }

            // Validate Code
            const invite = await FamilyInvite.findOne({
                code: inviteCode,
                status: "active",
                expiresAt: { $gt: new Date() },
            });

            if (!invite) {
                // Increment failed attempts
                user.familyInviteRateLimit.attempts = (user.familyInviteRateLimit.attempts || 0) + 1;

                if (user.familyInviteRateLimit.attempts >= 3) {
                    user.familyInviteRateLimit.blockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour block
                    await user.save();
                    return res.status(429).json({
                        success: false,
                        message: "Too many failed attempts. You are blocked for 1 hour.",
                    });
                }

                await user.save();
                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired invite code",
                    attemptsRemaining: 3 - user.familyInviteRateLimit.attempts,
                });
            }

            // Success: Link Users
            user.role = "family";
            user.linkedChild = invite.inviterId;
            user.familyInviteRateLimit = { attempts: 0, blockUntil: null }; // Reset limits
            // Store the permissions from the invite on the family member's record
            user.familyMode = user.familyMode || {};
            user.familyMode.permissions = invite.scope || ["view_matches"];

            await user.save();

            // Update Inviter
            await User.findByIdAndUpdate(invite.inviterId, {
                $addToSet: {
                    "familyMode.parents": {
                        name: user.name,
                        relation: user.familyMode?.familyRelation || "guardian",
                        relationDetail: user.familyMode?.familyRelationDetail,
                        permissions: invite.scope
                    }
                    // Note: storing ID in familyMembers still useful for references
                },
                $addToSet: { familyMembers: userId }
            });

            // Mark invite as used
            invite.status = 'used';
            invite.usedBy = userId;
            invite.usedAt = new Date();
            await invite.save();

            res.status(200).json({
                success: true,
                message: "Successfully linked to family account!",
                user,
            });
        } catch (error) {
            console.error("❌ Link family error:", error.message);
            res.status(500).json({ success: false, message: "Linking failed" });
        }
    }

    /**
     * GET CHILD DATA - Fetch restricted data for the family dashboard
     * Returns data based on the family member's permissions
     */
    async getChildData(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);

            if (user.role !== "family" || !user.linkedChild) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            // Get the family member's permissions
            const permissions = user.familyMode?.permissions || ["view_matches"];

            const child = await User.findById(user.linkedChild)
                .select("name photos matches profileCompleteness conversations")
                .populate({
                    path: "matches.userId",
                    select: "name photos city profession",
                });

            if (!child) {
                return res.status(404).json({ success: false, message: "Linked account not found" });
            }

            // Build response based on permissions
            const responseData = {
                permissions: permissions,
                childProfile: {
                    id: child._id,
                    name: child.name,
                    photo: child.photos?.find((p) => p.isPrimary)?.url || child.photos?.[0]?.url,
                    completeness: child.profileCompleteness,
                },
                matches: null,
                conversations: null,
            };

            // Include matches if has view_matches permission
            if (permissions.includes("view_matches")) {
                responseData.matches = child.matches?.map(match => ({
                    matchedAt: match.matchedAt,
                    compatibilityScore: match.compatibilityScore,
                    user: match.userId ? {
                        id: match.userId._id,
                        name: match.userId.name,
                        photo: match.userId.photos?.find(p => p.isPrimary)?.url || match.userId.photos?.[0]?.url,
                        city: match.userId.city,
                        profession: match.userId.profession,
                    } : null
                })).filter(m => m.user) || [];
            }

            // Include conversations if has chat permission
            if (permissions.includes("chat")) {
                const conversations = await Conversation.find({
                    participants: user.linkedChild,
                })
                    .populate({
                        path: "participants",
                        select: "name photos",
                    })
                    .populate({
                        path: "lastMessage",
                        select: "content type createdAt",
                    })
                    .sort({ updatedAt: -1 })
                    .limit(20);

                responseData.conversations = conversations.map(conv => ({
                    id: conv._id,
                    participants: conv.participants?.map(p => ({
                        id: p._id,
                        name: p.name,
                        photo: p.photos?.find(ph => ph.isPrimary)?.url || p.photos?.[0]?.url,
                    })),
                    lastMessage: conv.lastMessage ? {
                        content: conv.lastMessage.content,
                        type: conv.lastMessage.type,
                        createdAt: conv.lastMessage.createdAt,
                    } : null,
                    updatedAt: conv.updatedAt,
                }));
            }

            res.status(200).json({
                success: true,
                data: responseData,
            });
        } catch (error) {
            console.error("❌ Get child data error:", error.message);
            res.status(500).json({ success: false, message: "Failed to fetch data" });
        }
    }

    /**
     * GET MY INVITE CODES - Fetch all invite codes created by the current user
     */
    async getMyInviteCodes(req, res) {
        try {
            const userId = req.user.userId;

            const invites = await FamilyInvite.find({ inviterId: userId })
                .populate('usedBy', 'name email')
                .sort({ createdAt: -1 });

            // Calculate readable duration/expiry info
            const invitesWithMeta = invites.map(invite => {
                const now = new Date();
                const expiresAt = new Date(invite.expiresAt);
                const isExpired = expiresAt < now && invite.status === 'active';

                return {
                    _id: invite._id,
                    code: invite.code,
                    scope: invite.scope,
                    expiresAt: invite.expiresAt,
                    status: isExpired ? 'expired' : invite.status,
                    usedBy: invite.usedBy ? {
                        _id: invite.usedBy._id,
                        name: invite.usedBy.name,
                        email: invite.usedBy.email
                    } : null,
                    usedAt: invite.usedAt,
                    createdAt: invite.createdAt
                };
            });

            res.status(200).json({
                success: true,
                data: invitesWithMeta,
            });
        } catch (error) {
            console.error("❌ Get my invite codes error:", error.message);
            res.status(500).json({ success: false, message: "Failed to fetch invite codes" });
        }
    }
}

export default new FamilyController();
