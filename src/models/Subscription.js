import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: String,
    required: true,
    enum: ['premium_monthly', 'premium_yearly'] // Add your plan IDs here
  },
  platform: {
    type: String,
    enum: ['google', 'apple'],
    default: 'google'
  },
  purchaseToken: {
    type: String,
    required: true
  },
  orderId: {
    type: String
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  originalTransactionId: {
    type: String
  },
  paymentState: {
    type: Number // 0: Pending, 1: Payment Received, 2: Free Trial, 3: Pending Deferred
  },
  cancelReason: {
    type: Number
  }
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
