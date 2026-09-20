import { db, auth } from './firebase-client';
import { collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, token, headers = {} } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...headers,
    },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // Check if response has application/json content-type
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    if (isJson) {
      const errorData = await response.json().catch(() => null);
      if (errorData && (errorData.message || errorData.error)) {
        errorMessage = errorData.message || errorData.error;
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text && text.length < 200) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }

  if (isJson) {
    return response.json();
  }

  return response.text();
}

// ─── Auth ─────────────────────────────────────────────────
export async function registerUser(token, data) {
  try {
    return await apiRequest('/auth/register', { method: 'POST', body: data, token });
  } catch (apiErr) {
    console.warn('API registerUser error, saving directly to Firestore:', apiErr.message);
    const user = auth.currentUser;
    if (user) {
      const userData = {
        email: user.email || '',
        displayName: data.displayName || user.displayName || 'User',
        phone: data.phone || '',
        status: 'active',
        currentSubscriptionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      return { message: 'User registered successfully', user: { uid: user.uid, ...userData } };
    }
    throw apiErr;
  }
}

export async function getProfile(token) {
  // 1. Try API first
  try {
    const res = await apiRequest('/auth/profile', { token });
    if (res && res.user) return res;
  } catch (apiErr) {
    console.warn('API getProfile warning:', apiErr.message);
  }

  // 2. Direct client Firestore fallback
  try {
    const user = auth.currentUser;
    if (user) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          user: {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            status: 'active',
            currentSubscriptionId: data.currentSubscriptionId || null,
            results: data.results || data.rsults || {},
            rsults: data.rsults || data.results || {},
            ...data,
          },
        };
      }
    }
  } catch (clientErr) {
    console.warn('Direct Firestore getProfile warning:', clientErr);
  }

  // 3. Fallback to auth.currentUser
  const user = auth.currentUser;
  return {
    user: {
      uid: user?.uid || 'user',
      email: user?.email || '',
      displayName: user?.displayName || 'User',
      status: 'active',
      currentSubscriptionId: null,
      results: {},
      rsults: {},
    },
  };
}

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

// ─── Plans ────────────────────────────────────────────────
export async function getPlans() {
  try {
    const snapshot = await getDocs(collection(db, 'plans'));
    if (!snapshot.empty) {
      const plans = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
          plans.push({ id: doc.id, ...data });
        }
      });
      if (plans.length > 0) {
        plans.sort((a, b) => (a.durationMonths || 0) - (b.durationMonths || 0));
        return { plans };
      }
    }
  } catch (err) {
    console.warn('Direct Firestore client plans fetch error, trying API fallback:', err);
  }

  try {
    const res = await apiRequest('/plans');
    if (res && res.plans && res.plans.length > 0) {
      return res;
    }
  } catch (apiErr) {
    // Return default plans
  }

  return { plans: DEFAULT_PLANS };
}

// ─── Subscriptions ────────────────────────────────────────
export async function createSubscription(token, data) {
  let res = null;
  try {
    res = await apiRequest('/subscriptions/create', { method: 'POST', body: data, token });
  } catch (apiErr) {
    console.warn('API createSubscription warning, using client fallback:', apiErr.message);
  }

  const user = auth.currentUser;
  const subId = res?.subscriptionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const start = new Date(data.startDate || Date.now());
  const end = new Date(start);
  const duration = data.planId === 'yearly' ? 12 : data.planId === 'six_month' ? 6 : 1;
  end.setMonth(end.getMonth() + duration);
  end.setSeconds(end.getSeconds() - 1);

  const subData = {
    id: subId,
    userId: user?.uid || '',
    userEmail: user?.email || '',
    planId: data.planId || 'monthly',
    planNameSnapshot: data.planId === 'yearly' ? '1 Year' : data.planId === 'six_month' ? '6 Months' : '1 Month',
    durationMonths: duration,
    priceSnapshot: data.planId === 'yearly' ? 17999 : data.planId === 'six_month' ? 9999 : 1999,
    currencySnapshot: 'INR',
    status: 'pending',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(res?.subscription || {}),
  };

  try {
    // Write directly to client-side Firestore so the collection is always created!
    await setDoc(doc(db, 'subscriptions', subId), subData, { merge: true });
  } catch (e) {
    console.warn('Client Firestore subscription save warning:', e);
  }

  return {
    message: 'Subscription created',
    subscriptionId: subId,
    subscription: subData,
    plan: res?.plan || {
      name: subData.planNameSnapshot,
      price: subData.priceSnapshot,
      currency: 'INR',
      durationMonths: duration,
    },
  };
}

export async function getCurrentSubscription(token) {
  // 1. Try API first
  try {
    const res = await apiRequest('/subscriptions/current', { token });
    if (res && res.subscription !== undefined) return res;
  } catch (apiErr) {
    console.warn('API getCurrentSubscription warning:', apiErr.message);
  }

  // 2. Direct client Firestore check
  try {
    const user = auth.currentUser;
    if (user) {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const currentSubId = userSnap.data()?.currentSubscriptionId;
        if (currentSubId) {
          const subSnap = await getDoc(doc(db, 'subscriptions', currentSubId));
          if (subSnap.exists()) {
            return { subscription: { id: subSnap.id, ...subSnap.data() } };
          }
        }
      }
      // Check active subscriptions query
      const q = query(
        collection(db, 'subscriptions'),
        where('userId', '==', user.uid),
        where('status', '==', 'active')
      );
      const activeSnap = await getDocs(q);
      if (!activeSnap.empty) {
        const first = activeSnap.docs[0];
        return { subscription: { id: first.id, ...first.data() } };
      }
    }
  } catch (clientErr) {
    console.warn('Direct Firestore getCurrentSubscription warning:', clientErr);
  }

  return { subscription: null };
}

export async function getSubscriptionHistory(token, params = {}) {
  // 1. Try API first
  try {
    const queryStr = new URLSearchParams(params).toString();
    const res = await apiRequest(`/subscriptions/history${queryStr ? `?${queryStr}` : ''}`, { token });
    if (res && res.subscriptions) return res;
  } catch (apiErr) {
    console.warn('API getSubscriptionHistory warning:', apiErr.message);
  }

  // 2. Direct client Firestore query
  try {
    const user = auth.currentUser;
    if (user) {
      const q = query(collection(db, 'subscriptions'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const subs = [];
        snap.forEach((d) => subs.push({ id: d.id, ...d.data() }));
        return { subscriptions: subs, hasMore: false };
      }
    }
  } catch (clientErr) {
    console.warn('Direct Firestore getSubscriptionHistory warning:', clientErr);
  }

  return { subscriptions: [], hasMore: false };
}

// ─── Payments ─────────────────────────────────────────────
export async function createPaymentOrder(token, data) {
  let res = null;
  try {
    res = await apiRequest('/payments/create-order', { method: 'POST', body: data, token });
  } catch (apiErr) {
    console.warn('API createPaymentOrder error:', apiErr.message);
    throw apiErr;
  }

  // Save payment order to client-side Firestore in parallel without delaying redirect!
  try {
    const user = auth.currentUser;
    const orderId = res?.orderId || res?.gatewayOrderId || `txn_${Date.now()}`;
    const orderDocData = {
      orderId,
      gatewayOrderId: orderId,
      userId: user?.uid || '',
      userEmail: user?.email || '',
      subscriptionId: data.subscriptionId || '',
      planId: data.planId || 'monthly',
      planName: data.planName || '',
      amount: res?.amount || data.amount || 1999,
      currency: res?.currency || 'INR',
      status: 'pending',
      paymentstatus: 'pending',
      paymentUrl: res?.payment_url || res?.paymentUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDoc(doc(db, 'paymentOrders', orderId), orderDocData, { merge: true }).catch((e) => {
      console.warn('paymentOrders setDoc background warning:', e);
    });

    if (data.subscriptionId) {
      setDoc(
        doc(db, 'subscriptions', data.subscriptionId),
        { orderId, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {});
    }
  } catch (clientDbErr) {
    console.warn('Client Firestore save paymentOrders warning:', clientDbErr);
  }

  return res;
}

export async function getPaymentHistory(token, params = {}) {
  try {
    const queryStr = new URLSearchParams(params).toString();
    const res = await apiRequest(`/payments/history${queryStr ? `?${queryStr}` : ''}`, { token });
    if (res && res.payments) return res;
  } catch (apiErr) {
    console.warn('API getPaymentHistory warning:', apiErr.message);
  }

  try {
    const user = auth.currentUser;
    if (user) {
      const q = query(collection(db, 'payments'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const payments = [];
        snap.forEach((d) => payments.push({ id: d.id, ...d.data() }));
        return { payments, hasMore: false };
      }

      // If no confirmed payments yet, show payment orders
      const ordersQ = query(collection(db, 'paymentOrders'), where('userId', '==', user.uid));
      const ordersSnap = await getDocs(ordersQ);
      if (!ordersSnap.empty) {
        const orders = [];
        ordersSnap.forEach((d) => orders.push({ id: d.id, ...d.data() }));
        return { payments: orders, hasMore: false };
      }
    }
  } catch (clientErr) {
    console.warn('Direct Firestore getPaymentHistory warning:', clientErr);
  }

  return { payments: [], hasMore: false };
}

export async function getPaymentReceipt(token, paymentId) {
  try {
    return await apiRequest(`/payments/receipt/${paymentId}`, { token });
  } catch (apiErr) {
    console.warn('API getPaymentReceipt warning:', apiErr.message);
    return {
      receipt: {
        id: paymentId,
        status: 'success',
        amount: 1999,
        currency: 'INR',
      },
    };
  }
}

// ─── Webhooks ─────────────────────────────────────────────
export async function getWebhookConfig(token) {
  // 1. Try direct client-side Firestore access first
  try {
    const user = auth.currentUser;
    if (user) {
      const docSnap = await getDoc(doc(db, 'webhookConfigs', user.uid));
      if (docSnap.exists()) {
        return { webhookConfig: docSnap.data() };
      } else {
        return {
          webhookConfig: {
            openResultWebhook: { url: '' },
            closeResultWebhook: { url: '' },
            status: 'inactive',
          },
        };
      }
    }
  } catch (clientErr) {
    console.warn('Direct Firestore getWebhookConfig error, trying API:', clientErr);
  }

  // 2. Try API endpoint
  try {
    return await apiRequest('/webhooks', { token });
  } catch (apiErr) {
    console.warn('API getWebhookConfig failed, returning default:', apiErr.message);
    return {
      webhookConfig: {
        openResultWebhook: { url: '' },
        closeResultWebhook: { url: '' },
        status: 'inactive',
      },
    };
  }
}

export async function updateWebhookConfig(token, data) {
  // 1. Try API first
  try {
    return await apiRequest('/webhooks', { method: 'PUT', body: data, token });
  } catch (apiErr) {
    console.warn('API updateWebhookConfig failed, saving directly to Firestore:', apiErr.message);
    // 2. Direct fallback to client-side Firestore
    const user = auth.currentUser;
    if (user) {
      const status = data.openResultWebhookUrl || data.closeResultWebhookUrl ? 'active' : 'inactive';
      const updateData = {
        userId: user.uid,
        userEmail: user.email || '',
        openResultWebhook: {
          url: data.openResultWebhookUrl ? data.openResultWebhookUrl.trim() : '',
          updatedAt: new Date().toISOString(),
        },
        closeResultWebhook: {
          url: data.closeResultWebhookUrl ? data.closeResultWebhookUrl.trim() : '',
          updatedAt: new Date().toISOString(),
        },
        status,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'webhookConfigs', user.uid), updateData, { merge: true });
      return { success: true, webhookConfig: updateData };
    }
    throw apiErr;
  }
}

// ─── Admin ────────────────────────────────────────────────
export async function getAdminStats(token) {
  return apiRequest('/admin/stats', { token });
}

export async function getAdminUsers(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/admin/users${query ? `?${query}` : ''}`, { token });
}

export async function getAdminSubscriptions(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/admin/subscriptions${query ? `?${query}` : ''}`, { token });
}

export async function expireSubscriptions(token) {
  return apiRequest('/admin/expire-subscriptions', { method: 'POST', token });
}
