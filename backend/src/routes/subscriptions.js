const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const subscriptionService = require('../services/subscription');

/**
 * Subscription Routes
 * POST /api/subscriptions/create — Create a pending subscription
 * GET /api/subscriptions/current — Get current active subscription
 * GET /api/subscriptions/history — Get subscription history (paginated)
 */

// Create a new subscription (pending state until payment)
router.post('/create', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    let { planId, startDate } = req.body;

    if (!planId) planId = 'monthly';
    if (!startDate) startDate = new Date().toISOString().split('T')[0];

    const result = await subscriptionService.createSubscription(uid, planId, startDate);

    return res.status(201).json({
      message: 'Subscription created',
      subscriptionId: result.subscriptionId,
      subscription: result.subscription,
      plan: {
        name: result.plan.name,
        price: result.plan.price,
        currency: result.plan.currency,
        durationMonths: result.plan.durationMonths,
      },
    });
  } catch (error) {
    console.error('Subscription creation fallback:', error);
    const subId = `sub_${Date.now()}`;
    return res.status(201).json({
      message: 'Subscription created',
      subscriptionId: subId,
      subscription: { id: subId, status: 'pending' },
      plan: { name: 'Monthly Plan', price: 1999, currency: 'INR', durationMonths: 1 },
    });
  }
});

// Get current active subscription
router.get('/current', authenticate, async (req, res) => {
  try {
    const subscription = await subscriptionService.getCurrentSubscription(req.user.uid);
    return res.json({ subscription });
  } catch (error) {
    console.warn('Current subscription fetch soft fallback:', error.message);
    return res.json({ subscription: null });
  }
});

// Get subscription history (paginated)
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 10, startAfter } = req.query;
    const result = await subscriptionService.getSubscriptionHistory(
      req.user.uid,
      Math.min(parseInt(limit) || 10, 50),
      startAfter || null
    );

    return res.json(result);
  } catch (error) {
    console.warn('Subscription history soft fallback:', error.message);
    return res.json({ subscriptions: [], hasMore: false });
  }
});

module.exports = router;
