const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const subscriptionService = require('../services/subscription');

/**
 * Admin Routes — All protected by admin middleware
 * GET /api/admin/stats — Dashboard statistics
 * GET /api/admin/users — Paginated user list
 * GET /api/admin/subscriptions — Paginated subscription list (active/expired)
 * POST /api/admin/expire-subscriptions — Manually trigger subscription expiry
 */

// Apply auth + admin middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get counts using aggregation queries where possible
    const [usersSnap, activeSubsSnap, expiredSubsSnap, paymentsSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('subscriptions').where('status', '==', 'active').count().get(),
      db.collection('subscriptions').where('status', '==', 'expired').count().get(),
      db.collection('payments').where('status', '==', 'success').count().get(),
    ]);

    // Calculate total revenue from successful payments
    const revenueSnap = await db
      .collection('payments')
      .where('status', '==', 'success')
      .select('amount')
      .get();

    let totalRevenue = 0;
    revenueSnap.forEach((doc) => {
      totalRevenue += doc.data().amount || 0;
    });

    res.json({
      stats: {
        totalUsers: usersSnap.data().count,
        activeSubscriptions: activeSubsSnap.data().count,
        expiredSubscriptions: expiredSubsSnap.data().count,
        totalPayments: paymentsSnap.data().count,
        totalRevenue,
        currency: 'INR',
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch stats',
    });
  }
});

// Paginated user list
router.get('/users', async (req, res) => {
  try {
    const { limit = 25, startAfter, status, search } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 25, 50);

    let query = db.collection('users').orderBy('createdAt', 'desc').limit(pageLimit);

    if (status) {
      query = db
        .collection('users')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(pageLimit);
    }

    if (startAfter) {
      const lastDoc = await db.collection('users').doc(startAfter).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const users = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data();

      // Get subscription info if exists
      let subscription = null;
      if (userData.currentSubscriptionId) {
        const subDoc = await db
          .collection('subscriptions')
          .doc(userData.currentSubscriptionId)
          .get();
        if (subDoc.exists) {
          subscription = { id: subDoc.id, ...subDoc.data() };
        }
      }

      users.push({
        uid: doc.id,
        ...userData,
        subscription,
      });
    }

    res.json({
      users,
      hasMore: users.length === pageLimit,
      lastDocId: users.length > 0 ? users[users.length - 1].uid : null,
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch users',
    });
  }
});

// Paginated subscription list with status filter
router.get('/subscriptions', async (req, res) => {
  try {
    const { limit = 25, startAfter, status = 'active' } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 25, 50);

    let query = db
      .collection('subscriptions')
      .where('status', '==', status)
      .orderBy('endDate', status === 'active' ? 'asc' : 'desc')
      .limit(pageLimit);

    if (startAfter) {
      const lastDoc = await db.collection('subscriptions').doc(startAfter).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const subscriptions = [];

    for (const doc of snapshot.docs) {
      const subData = doc.data();

      // Get user info
      let user = null;
      if (subData.userId) {
        const userDoc = await db.collection('users').doc(subData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          user = {
            uid: userDoc.id,
            email: userData.email,
            displayName: userData.displayName,
          };
        }
      }

      subscriptions.push({
        id: doc.id,
        ...subData,
        user,
      });
    }

    res.json({
      subscriptions,
      hasMore: subscriptions.length === pageLimit,
      lastDocId:
        subscriptions.length > 0 ? subscriptions[subscriptions.length - 1].id : null,
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch subscriptions',
    });
  }
});

// Manually trigger subscription expiry check
router.post('/expire-subscriptions', async (req, res) => {
  try {
    const result = await subscriptionService.expireSubscriptions();

    // Log admin action
    await db.collection('adminAuditLogs').add({
      action: 'expire_subscriptions',
      performedBy: req.user.uid,
      result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      message: `Expired ${result.expired} subscriptions`,
      ...result,
    });
  } catch (error) {
    console.error('Expire subscriptions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to expire subscriptions',
    });
  }
});

module.exports = router;
