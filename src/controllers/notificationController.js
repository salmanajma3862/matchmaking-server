import { registerDevice, unregisterDevice } from '../services/notificationService.js';

/**
 * Register device for push notifications
 * POST /notifications/register
 * Body: { fcmToken: string }
 */
export const registerPushToken = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                message: 'FCM token is required'
            });
        }

        await registerDevice(userId, fcmToken);

        res.json({
            success: true,
            message: 'Device registered successfully'
        });
    } catch (error) {
        console.error('[NotificationController] Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register device'
        });
    }
};

/**
 * Unregister device from push notifications
 * DELETE /notifications/unregister
 */
export const unregisterPushToken = async (req, res) => {
    try {
        const userId = req.user.userId;

        await unregisterDevice(userId);

        res.json({
            success: true,
            message: 'Device unregistered successfully'
        });
    } catch (error) {
        console.error('[NotificationController] Unregister error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unregister device'
        });
    }
};

export default {
    registerPushToken,
    unregisterPushToken
};
