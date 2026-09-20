const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const subscriptionService = require('../services/subscription');

/**
 * Helper: Delete all documents matching a query in batches of 500
 */
async function deleteQueryDocs(query) {
  let totalDeleted = 0;
  while (true) {
    const snapshot = await query.limit(500).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < 500) {
      break;
    }
  }
  return totalDeleted;
}

/**
 * Route 1: Expire Overdue Subscriptions
 * GET /api/cron/expire-subscriptions
/**
 * Route 1: Expire Overdue Subscriptions
 * GET/POST /api/cron/expire-subscriptions
 * Publicly accessible - no authentication required
 */
/**
 * Route 1: Expire Overdue Subscriptions
 * GET/POST /api/cron/expire-subscriptions
 * Publicly accessible - no authentication required
 */
router.all(['/', '/expire-subscriptions', '/check-expiry'], async (req, res) => {
  try {
    console.log(`[CRON] Expiry check triggered at ${new Date().toISOString()}`);

    const result = await subscriptionService.expireSubscriptions();

    console.log(`[CRON] Expiry check completed. Expired: ${result.expired} subscriptions`);

    return res.status(200).json({
      success: true,
      message: result.expired > 0 
        ? `Successfully expired ${result.expired} subscription(s)` 
        : 'No subscriptions due for expiration',
      expiredCount: result.expired,
      currentTimeIST: result.currentTimeIST,
      expiredSubscriptions: result.subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[CRON] Warning expiring subscriptions:', error.message);
    const istString = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return res.status(200).json({
      success: false,
      message: 'Failed to expire subscriptions - database access error',
      error: error.message,
      expiredCount: 0,
      currentTimeIST: istString,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Route 2: Delete Pending Subscriptions and Pending Payment Orders
 * GET/POST /api/cron/delete-pending
 * Publicly accessible - no authentication required
 */
router.all(['/delete-pending', '/cleanup-pending', '/delete-pending-subscriptions'], async (req, res) => {
  try {
    console.log(`[CRON] Delete pending cleanup triggered at ${new Date().toISOString()}`);

    let deletedSubscriptions = 0;
    let deletedPaymentOrders = 0;
    let usersCleanedCount = 0;
    const errors = [];

    try {
      // 1. Delete pending subscriptions from 'subscriptions'
      const pendingSubsQuery = db.collection('subscriptions').where('status', '==', 'pending');
      deletedSubscriptions = await deleteQueryDocs(pendingSubsQuery);
    } catch (e) {
      console.warn('Delete pending subscriptions query warning:', e.message);
      errors.push(`Subscriptions: ${e.message}`);
    }

    try {
      // 2. Delete pending orders from 'paymentOrders'
      const pendingOrdersQuery = db.collection('paymentOrders').where('status', '==', 'pending');
      deletedPaymentOrders = await deleteQueryDocs(pendingOrdersQuery);
    } catch (e) {
      console.warn('Delete pending payment orders query warning:', e.message);
      errors.push(`PaymentOrders: ${e.message}`);
    }

    try {
      // 3. Reset/clear results and rsults data for each user document in 'users' collection
      const usersSnapshot = await db.collection('users').get();

      for (let i = 0; i < usersSnapshot.docs.length; i += 500) {
        const chunk = usersSnapshot.docs.slice(i, i + 500);
        const batch = db.batch();

        chunk.forEach((doc) => {
          batch.set(
            doc.ref,
            {
              results: {},
              rsults: {},
            },
            { merge: true }
          );
          usersCleanedCount++;
        });

        await batch.commit();
      }
    } catch (e) {
      console.warn('Reset user results query warning:', e.message);
      errors.push(`UsersReset: ${e.message}`);
    }

    const istString = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    console.log(`[CRON] Deleted ${deletedSubscriptions} pending subscriptions, ${deletedPaymentOrders} pending payment orders, and cleared results for ${usersCleanedCount} user(s)`);

    return res.status(200).json({
      success: errors.length === 0,
      message: errors.length > 0 
        ? `Database operation failed: ${errors.join(' | ')}`
        : `Successfully deleted ${deletedSubscriptions} pending subscription(s), ${deletedPaymentOrders} pending payment order(s), and cleared results for ${usersCleanedCount} user(s)`,
      deletedSubscriptionsCount: deletedSubscriptions,
      deletedPaymentOrdersCount: deletedPaymentOrders,
      clearedUsersResultsCount: usersCleanedCount,
      errors: errors.length > 0 ? errors : null,
      currentTimeIST: istString,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[CRON] Warning deleting pending records:', error.message);
    const istString = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return res.status(200).json({
      success: false,
      message: 'Failed to delete pending records',
      error: error.message,
      deletedSubscriptionsCount: 0,
      deletedPaymentOrdersCount: 0,
      clearedUsersResultsCount: 0,
      currentTimeIST: istString,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
