import { google } from 'googleapis';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

// Ensure you have set GOOGLE_APPLICATION_CREDENTIALS in your .env file pointing to your service account JSON
// Example: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

const packageName = 'com.salmanajmal.ziya'; // Your app package name

export const verifyPurchase = async (req, res) => {
  try {
    const { purchaseToken, productId, orderId } = req.body;
    const userId = req.user.userId; // Assuming auth middleware adds user to req

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    
    const authClient = await auth.getClient();

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient
    });

    // Verify with Google Play
    // Note: For one-time products use: androidPublisher.purchases.products.get
    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: productId,
      token: purchaseToken
    });

    const purchaseData = response.data;

    // Check if valid
    // paymentState: 1 = Payment received, 2 = Free trial
    // If paymentState is undefined, it might be a test purchase or different state, check docs
    if (purchaseData.paymentState === 1 || purchaseData.paymentState === 2 || purchaseData.paymentState === undefined) { 
        
        const expiryTimeMillis = parseInt(purchaseData.expiryTimeMillis);
        const expiryDate = new Date(expiryTimeMillis);

        // Update or create subscription in DB
        let subscription = await Subscription.findOne({ purchaseToken });

        if (!subscription) {
            subscription = new Subscription({
                userId,
                planId: productId,
                purchaseToken,
                orderId,
                expiryDate,
                autoRenew: purchaseData.autoRenewing,
                paymentState: purchaseData.paymentState
            });
        } else {
            subscription.expiryDate = expiryDate;
            subscription.autoRenew = purchaseData.autoRenewing;
            subscription.paymentState = purchaseData.paymentState;
        }

        await subscription.save();

        // Update User
        await User.findByIdAndUpdate(userId, {
            isPremium: true,
            subscriptionExpiry: expiryDate,
            subscriptionPlan: productId
        });

        res.status(200).json({ success: true, message: 'Subscription verified', subscription });
    } else {
        res.status(400).json({ success: false, message: 'Invalid purchase state', data: purchaseData });
    }

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};
