import { db, auth } from './firebase-client';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

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
  return apiRequest('/auth/register', { method: 'POST', body: data, token });
}

export async function getProfile(token) {
  return apiRequest('/auth/profile', { token });
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
// Directly access plans collection from client-side Firestore without requiring backend admin
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

  // Fallback to backend or default plans
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
  return apiRequest('/subscriptions/create', { method: 'POST', body: data, token });
}

export async function getCurrentSubscription(token) {
  return apiRequest('/subscriptions/current', { token });
}

export async function getSubscriptionHistory(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/subscriptions/history${query ? `?${query}` : ''}`, { token });
}

// ─── Payments ─────────────────────────────────────────────
export async function createPaymentOrder(token, data) {
  return apiRequest('/payments/create-order', { method: 'POST', body: data, token });
}

export async function getPaymentHistory(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/payments/history${query ? `?${query}` : ''}`, { token });
}

export async function getPaymentReceipt(token, paymentId) {
  return apiRequest(`/payments/receipt/${paymentId}`, { token });
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
