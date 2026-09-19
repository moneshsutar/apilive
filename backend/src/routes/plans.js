const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

const DEFAULT_PLANS = [
  {
    id: 'monthly',
    name: '1 Month',
    durationMonths: 1,
    price: 1999,
    currency: 'INR',
    isActive: true,
    features: [
      'Open Result Webhook',
      'Close Result Webhook',
      'Real-time API Results',
      'Email Support',
    ],
  },
  {
    id: 'six_month',
    name: '6 Months',
    durationMonths: 6,
    price: 9999,
    currency: 'INR',
    isActive: true,
    features: [
      'Open Result Webhook',
      'Close Result Webhook',
      'Real-time API Results',
      'Priority Support',
      'Save 17%',
    ],
  },
  {
    id: 'yearly',
    name: '1 Year',
    durationMonths: 12,
    price: 17999,
    currency: 'INR',
    isActive: true,
    features: [
      'Open Result Webhook',
      'Close Result Webhook',
      'Real-time API Results',
      'Priority Support',
      'Save 25%',
      'Best Value',
    ],
  },
];

/**
 * Plans Routes
 * GET /api/plans — Get all active plans (public, no authentication required)
 */
router.get('/', async (req, res) => {
  try {
    const snapshot = await db
      .collection('plans')
      .where('isActive', '==', true)
      .get();

    const plans = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() });
    });

    if (plans.length > 0) {
      plans.sort((a, b) => (a.durationMonths || 0) - (b.durationMonths || 0));
      return res.json({ plans });
    }

    return res.json({ plans: DEFAULT_PLANS });
  } catch (error) {
    console.warn('[PLANS] Firestore read skipped or unauthenticated, returning default plans:', error.message);
    return res.json({ plans: DEFAULT_PLANS });
  }
});

module.exports = router;
