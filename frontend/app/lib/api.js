/**
 * API Helper
 * All data operations go through the backend API — NO direct Firestore access
 * Attaches Firebase ID token to every request
 */

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

// ─── Plans ────────────────────────────────────────────────
export async function getPlans() {
  return apiRequest('/plans');
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
  return apiRequest('/webhooks', { token });
}

export async function updateWebhookConfig(token, data) {
  return apiRequest('/webhooks', { method: 'PUT', body: data, token });
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
