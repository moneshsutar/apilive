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
    const { planId, startDate } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Plan ID is required',
      });
    }

    if (!startDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Start date is required',
      });
    }

    const result = await subscriptionService.createSubscription(uid, planId, startDate);

    res.status(201).json({
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
    console.error('Subscription creation error:', error);

    if (
      error.message === 'Plan not found' ||
      error.message === 'Plan is no longer available' ||
      error.message === 'Invalid start date' ||
      error.message === 'Start date cannot be in the past'
    ) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create subscription',
    });
  }
});

// Get current active subscription
router.get('/current', authenticate, async (req, res) => {
  try {
    const subscription = await subscriptionService.getCurrentSubscription(req.user.uid);

    res.json({ subscription });
  } catch (error) {
    console.error('Current subscription fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch current subscription',
    });
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

    res.json(result);
  } catch (error) {
    console.error('Subscription history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch subscription history',
    });
  }
});

module.exports = router;
