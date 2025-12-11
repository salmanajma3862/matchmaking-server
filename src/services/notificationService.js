import { NotificationHubsClient, createFcmV1Notification } from "@azure/notification-hubs";
import User from '../models/User.js';

// Initialize client with connection string from environment
const connectionString = process.env.CONNECTION_STRING;
const hubName = process.env.NOTIFICATION_HUB_NAME || "my-notification-hub";

let client = null;

/**
 * Get or create the Notification Hub client
 */
function getClient() {
    if (!client) {
        if (!connectionString) {
            console.error('[NotificationService] CONNECTION_STRING not configured');
            return null;
        }
        client = new NotificationHubsClient(connectionString, hubName);
        console.log('[NotificationService] Azure Notification Hub client initialized');
    }
    return client;
}

/**
 * Register a device's FCM token with Azure Notification Hub using Installations API
 * @param {string} userId - The user's MongoDB ID
 * @param {string} fcmToken - The FCM registration token from the device
 */
export async function registerDevice(userId, fcmToken) {
    try {
        const nhClient = getClient();
        if (!nhClient) {
            throw new Error('Notification Hub client not initialized');
        }

        // Use Installation API which is the modern approach
        const installation = {
            installationId: userId, // Use userId as installation ID for easy targeting
            platform: "fcmv1", // FCM v1 platform
            pushChannel: fcmToken, // The FCM token
            tags: [`userId:${userId}`]
        };

        // Create or update the installation
        await nhClient.createOrUpdateInstallation(installation);
        console.log(`[NotificationService] Device registered for user ${userId}`);

        // Save the FCM token to the user document for reference
        await User.findByIdAndUpdate(userId, { pushToken: fcmToken });

        return { success: true, installationId: userId };
    } catch (error) {
        console.error('[NotificationService] Error registering device:', error);
        throw error;
    }
}

/**
 * Unregister a device from Azure Notification Hub
 * @param {string} userId - The user's MongoDB ID
 */
export async function unregisterDevice(userId) {
    try {
        const nhClient = getClient();
        if (nhClient) {
            try {
                await nhClient.deleteInstallation(userId);
            } catch (deleteError) {
                // Installation might not exist, that's OK
                console.log('[NotificationService] Installation not found or already deleted');
            }
        }

        // Clear the push token from the user document
        await User.findByIdAndUpdate(userId, { pushToken: null });
        console.log(`[NotificationService] Device unregistered for user ${userId}`);
    } catch (error) {
        console.error('[NotificationService] Error unregistering device:', error);
        throw error;
    }
}

/**
 * Send a push notification to a specific user
 * @param {string} userId - Target user's MongoDB ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Additional data payload
 */
export async function sendNotification(userId, title, body, data = {}) {
    try {
        const nhClient = getClient();
        if (!nhClient) {
            console.warn('[NotificationService] Hub not configured, skipping notification');
            return null;
        }

        // Convert all data values to strings (FCM requirement)
        const stringData = {};
        for (const [key, value] of Object.entries(data)) {
            stringData[key] = String(value);
        }
        stringData.type = stringData.type || "general";

        // FCM v1 notification using SDK helper
        const notification = createFcmV1Notification({
            body: JSON.stringify({
                message: {
                    notification: {
                        title: title,
                        body: body
                    },
                    data: stringData,
                    android: {
                        priority: "high",
                        notification: {
                            sound: "default",
                            click_action: "OPEN_APP"
                        }
                    }
                }
            })
        });

        // Send to specific user using their tag
        const result = await nhClient.sendNotification(notification, {
            tagExpression: `userId:${userId}`
        });

        console.log(`[NotificationService] Notification sent to user ${userId}: ${title}`);
        console.log(`[NotificationService] Tracking ID: ${result.trackingId}`);
        return result;
    } catch (error) {
        console.error('[NotificationService] Error sending notification:', error);
        // Don't throw - notifications failing shouldn't break the main flow
        return null;
    }
}

/**
 * Send a push notification to multiple users
 * @param {string[]} userIds - Array of target user MongoDB IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Additional data payload
 */
export async function sendNotificationToMultiple(userIds, title, body, data = {}) {
    try {
        const nhClient = getClient();
        if (!nhClient) {
            console.warn('[NotificationService] Hub not configured, skipping notifications');
            return null;
        }

        // Create tag expression for multiple users (OR condition)
        const tagExpression = userIds.map(id => `userId:${id}`).join(' || ');

        // Convert all data values to strings
        const stringData = {};
        for (const [key, value] of Object.entries(data)) {
            stringData[key] = String(value);
        }
        stringData.type = stringData.type || "general";

        const notification = createFcmV1Notification({
            body: JSON.stringify({
                message: {
                    notification: {
                        title: title,
                        body: body
                    },
                    data: stringData,
                    android: {
                        priority: "high",
                        notification: {
                            sound: "default",
                            click_action: "OPEN_APP"
                        }
                    }
                }
            })
        });

        const result = await nhClient.sendNotification(notification, {
            tagExpression
        });

        console.log(`[NotificationService] Notification sent to ${userIds.length} users: ${title}`);
        return result;
    } catch (error) {
        console.error('[NotificationService] Error sending batch notification:', error);
        return null;
    }
}

/**
 * Send a new message notification
 * @param {string} recipientId - Recipient user ID
 * @param {string} senderName - Name of the message sender
 * @param {string} messagePreview - Preview of the message text
 * @param {string} conversationId - The conversation ID to open
 */
export async function sendNewMessageNotification(recipientId, senderName, messagePreview, conversationId) {
    const title = `New message from ${senderName}`;
    const body = messagePreview.length > 50 ? messagePreview.substring(0, 47) + '...' : messagePreview;

    return sendNotification(recipientId, title, body, {
        type: 'new_message',
        conversationId: conversationId
    });
}

/**
 * Send a new match notification
 * @param {string} userId - User ID to notify
 * @param {string} matchedUserName - Name of the matched user
 * @param {string} matchId - The match ID
 */
export async function sendNewMatchNotification(userId, matchedUserName, matchId) {
    const title = "It's a Match! 🎉";
    const body = `You and ${matchedUserName} have liked each other!`;

    return sendNotification(userId, title, body, {
        type: 'new_match',
        matchId: matchId
    });
}

export default {
    registerDevice,
    unregisterDevice,
    sendNotification,
    sendNotificationToMultiple,
    sendNewMessageNotification,
    sendNewMatchNotification
};


