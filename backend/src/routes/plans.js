const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

/**
 * Plans Routes
 * GET /api/plans — Get all active plans
 * Plans are public — no authentication required to view
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

    // In-memory sort by durationMonths ascending (eliminates composite index requirement)
    plans.sort((a, b) => (a.durationMonths || 0) - (b.durationMonths || 0));

    res.json({ plans });
  } catch (error) {
    console.error('Plans fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch plans',
    });
  }
});

module.exports = router;
