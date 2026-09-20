const { db, admin } = require('../config/firebase');

const DEFAULT_PLANS = {
  monthly: {
    id: 'monthly',
    name: '1 Month',
    durationMonths: 1,
    price: 1999,
    currency: 'INR',
    isActive: true,
  },
  six_month: {
    id: 'six_month',
    name: '6 Months',
    durationMonths: 6,
    price: 9999,
    currency: 'INR',
    isActive: true,
  },
  yearly: {
    id: 'yearly',
    name: '1 Year',
    durationMonths: 12,
    price: 17999,
    currency: 'INR',
    isActive: true,
  },
};

/**
 * Subscription Service
 * Handles all subscription business logic
 * All date calculations happen server-side
 */

/**
 * Create a new subscription in pending state
 * Backend calculates endDate from startDate + durationMonths
 */
async function createSubscription(userId, planId = 'monthly', startDate) {
  let plan = DEFAULT_PLANS[planId] || DEFAULT_PLANS.monthly;

  try {
    const planDoc = await db.collection('plans').doc(planId).get();
    if (planDoc.exists) {
      const data = planDoc.data();
      if (data && data.isActive !== false) {
        plan = { id: planDoc.id, ...data };
      }
    }
  } catch (err) {
    console.warn('Plans collection read failed (using default plan config):', err.message);
  }

  // Calculate dates safely
  let start = new Date(startDate || Date.now());
  if (isNaN(start.getTime())) {
    start = new Date();
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + (plan.durationMonths || 1));
  end.setSeconds(end.getSeconds() - 1);

  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let startTimestamp = null;
  let endTimestamp = null;
  try {
    startTimestamp = admin.firestore.Timestamp.fromDate(start);
    endTimestamp = admin.firestore.Timestamp.fromDate(end);
  } catch (e) {
    startTimestamp = start.toISOString();
    endTimestamp = end.toISOString();
  }

  const subscriptionData = {
    id: subscriptionId,
    userId,
    planId: plan.id || planId,
    planNameSnapshot: plan.name,
    durationMonths: plan.durationMonths || 1,
    priceSnapshot: plan.price,
    currencySnapshot: plan.currency || 'INR',
    status: 'pending',
    startDate: startTimestamp,
    endDate: endTimestamp,
    paymentId: null,
    orderId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection('subscriptions').doc(subscriptionId).set({
      ...subscriptionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (dbErr) {
    console.warn('Subscriptions Firestore write warning (proceeding):', dbErr.message);
  }

  return { subscriptionId, subscription: subscriptionData, plan };
}

/**
 * Activate subscription after verified payment
 * Updates subscription status and user's currentSubscriptionId
 */
async function activateSubscription(subscriptionId, paymentId, orderId) {
  const batch = db.batch();

  const subRef = db.collection('subscriptions').doc(subscriptionId);
  const subDoc = await subRef.get();

  if (!subDoc.exists) {
    throw new Error('Subscription not found');
  }

  const sub = subDoc.data();

  // Update subscription
  batch.update(subRef, {
    status: 'active',
    paymentId,
    orderId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update user's currentSubscriptionId for fast lookup
  const userRef = db.collection('users').doc(sub.userId);
  batch.update(userRef, {
    currentSubscriptionId: subscriptionId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { ...sub, status: 'active', paymentId, orderId };
}

/**
 * Get current active subscription for a user
 * Uses the fast lookup pattern: user.currentSubscriptionId → subscription doc
 */
async function getCurrentSubscription(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const user = userDoc.data();

    if (!user.currentSubscriptionId) {
      return null;
    }

    const subDoc = await db.collection('subscriptions').doc(user.currentSubscriptionId).get();

    if (!subDoc.exists) {
      return null;
    }

    const sub = subDoc.data();

    // Check if actually active (status + endDate > now)
    const now = new Date();
    const endDate = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);

    if (sub.status === 'active' && endDate > now) {
      return { id: subDoc.id, ...sub };
    }

    return { id: subDoc.id, ...sub, effectiveStatus: 'expired' };
  } catch (err) {
    console.warn('getCurrentSubscription Firestore read warning:', err.message);
    return null;
  }
}

/**
 * Get subscription history for a user, paginated
 */
async function getSubscriptionHistory(userId, limit = 10, startAfterDoc = null) {
  try {
    let query = db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfterDoc) {
      const lastDoc = await db.collection('subscriptions').doc(startAfterDoc).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const subscriptions = [];
    snapshot.forEach((doc) => {
      subscriptions.push({ id: doc.id, ...doc.data() });
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      subscriptions,
      lastDocId: lastVisible ? lastVisible.id : null,
      hasMore: snapshot.docs.length === limit,
    };
  } catch (err) {
    console.warn('getSubscriptionHistory query warning:', err.message);
    try {
      const snapshot = await db.collection('subscriptions').where('userId', '==', userId).get();
      const subscriptions = [];
      snapshot.forEach((doc) => subscriptions.push({ id: doc.id, ...doc.data() }));
      return {
        subscriptions: subscriptions.slice(0, limit),
        lastDocId: null,
        hasMore: false,
      };
    } catch (fallbackErr) {
      return {
        subscriptions: [],
        lastDocId: null,
        hasMore: false,
      };
    }
  }
}

/**
 * Expire subscriptions that have passed their endDate
 * Finds active subscriptions where endDate < now (current IST time)
 * Updates subscriptions/{id} status = 'expired'
 * Updates users/{uid} currentSubscriptionId = null
 */
async function expireSubscriptions() {
  const now = new Date();
  const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
  const istString = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  let snapshot;
  try {
    snapshot = await db
      .collection('subscriptions')
      .where('status', '==', 'active')
      .where('endDate', '<', nowTimestamp)
      .limit(500)
      .get();
  } catch (err) {
    if (err.code === 9) {
      // Fallback in-memory filter if composite index is pending
      const allActive = await db
        .collection('subscriptions')
        .where('status', '==', 'active')
        .get();
      const docs = [];
      allActive.forEach((doc) => {
        const data = doc.data();
        const end = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
        if (end < now) {
          docs.push(doc);
        }
      });
      snapshot = { empty: docs.length === 0, docs };
    } else {
      throw err;
    }
  }

  if (snapshot.empty || !snapshot.docs || snapshot.docs.length === 0) {
    return {
      expired: 0,
      subscriptions: [],
      currentTimeIST: istString,
    };
  }

  const batch = db.batch();
  let count = 0;
  const expiredSubscriptions = [];

  for (const doc of snapshot.docs) {
    const sub = doc.data();

    // 1. Update subscriptions/{id}: status = 'expired'
    batch.update(doc.ref, {
      status: 'expired',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Update users/{uid}: currentSubscriptionId = null
    if (sub.userId) {
      const userRef = db.collection('users').doc(sub.userId);
      batch.update(userRef, {
        currentSubscriptionId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    expiredSubscriptions.push({
      subscriptionId: doc.id,
      userId: sub.userId,
      planId: sub.planId,
      endDate: sub.endDate?.toDate ? sub.endDate.toDate().toISOString() : sub.endDate,
    });
    count++;
  }

  await batch.commit();

  return {
    expired: count,
    subscriptions: expiredSubscriptions,
    currentTimeIST: istString,
  };
}

module.exports = {
  createSubscription,
  activateSubscription,
  getCurrentSubscription,
  getSubscriptionHistory,
  expireSubscriptions,
};
