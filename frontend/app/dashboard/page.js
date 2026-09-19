'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import PaymentSuccessModal from '@/app/components/PaymentSuccessModal';
import AvailableMarkets from '@/app/components/AvailableMarkets';
import { useAuth } from '@/app/lib/auth-context';
import { getCurrentSubscription, getWebhookConfig, getSubscriptionHistory, getProfile } from '@/app/lib/api';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, getToken } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [previousSubscriptions, setPreviousSubscriptions] = useState([]);
  const [webhooks, setWebhooks] = useState(null);
  const [userResults, setUserResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        if (!token) return;
        const [subRes, webhookRes, historyRes, profileRes] = await Promise.all([
          getCurrentSubscription(token),
          getWebhookConfig(token),
          getSubscriptionHistory(token, { limit: 20 }),
          getProfile(token),
        ]);
        setSubscription(subRes.subscription);
        setWebhooks(webhookRes.webhookConfig);
        setUserResults(profileRes?.user?.results || profileRes?.user?.rsults || {});

        const allSubs = historyRes?.subscriptions || [];
        const prevSubs = subRes.subscription?.id
          ? allSubs.filter((s) => s.id !== subRes.subscription.id)
          : allSubs;
        setPreviousSubscriptions(prevSubs);

        // Realtime check for newly activated subscription
        if (subRes.subscription?.status === 'active') {
          const subId = subRes.subscription.id;
          const isPaidParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('paid');
          const storageKey = `ack_sub_${subId}`;
          const alreadyAcked = typeof window !== 'undefined' && sessionStorage.getItem(storageKey);

          if (isPaidParam || (!alreadyAcked && subRes.subscription.paymentId)) {
            setShowSuccessModal(true);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(storageKey, 'true');
              if (isPaidParam) {
                window.history.replaceState({}, '', window.location.pathname);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [getToken]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const end = endDate._seconds
      ? new Date(endDate._seconds * 1000)
      : new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const isActive = subscription?.status === 'active' && getDaysRemaining(subscription?.endDate) > 0;
  const isExpired = subscription?.status === 'expired' || (subscription?.status === 'active' && getDaysRemaining(subscription?.endDate) === 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">

        {/* Subscription Status */}
        <div className="dashboard-section animate-fade-in-up delay-1">
          <h2>Subscription</h2>
          {subscription ? (
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="flex items-center gap-3">
                  <span className={`status-dot ${isActive ? 'active' : isExpired ? 'expired' : 'pending'}`}></span>
                  <span className="font-semibold" style={{ fontSize: 'var(--text-md)' }}>
                    {subscription.planNameSnapshot || 'Subscription'}
                  </span>
                </div>
                <span className={`badge ${isActive ? 'badge-success' : isExpired ? 'badge-error' : 'badge-warning'}`}>
                  {isActive ? 'Active' : isExpired ? 'Expired' : subscription.status}
                </span>
              </div>

              <div className="dashboard-grid" style={{ marginTop: 'var(--space-4)' }}>
                <div>
                  <div className="stat-label">Start Date</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>
                    {formatDate(subscription.startDate)}
                  </div>
                </div>
                <div>
                  <div className="stat-label">End Date</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>
                    {formatDate(subscription.endDate)}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Days Remaining</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>
                    {isActive ? `${getDaysRemaining(subscription.endDate)} days` : '—'}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Duration</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>
                    {subscription.durationMonths} {subscription.durationMonths === 1 ? 'month' : 'months'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
              <h3 style={{ color: 'var(--fg-secondary)', marginBottom: 'var(--space-2)' }}>
                No Active Subscription
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-tertiary)', marginBottom: 'var(--space-6)' }}>
                Choose a plan to start receiving API results
              </p>
              <Link href="/dashboard/plans" className="btn btn-primary">
                View Plans
              </Link>
            </div>
          )}
        </div>

        {/* Previous Subscriptions */}
        <div className="dashboard-section animate-fade-in-up delay-2">
          <h2>Previous Subscriptions</h2>
          {previousSubscriptions.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Duration</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previousSubscriptions.map((sub) => {
                    const subEnd = sub.endDate?._seconds
                      ? new Date(sub.endDate._seconds * 1000)
                      : new Date(sub.endDate);
                    const isSubActive = sub.status === 'active' && subEnd > new Date();
                    const isSubExpired = sub.status === 'expired' || (sub.status === 'active' && subEnd <= new Date());

                    return (
                      <tr key={sub.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--fg)' }}>
                            {sub.planNameSnapshot || sub.planId || 'Subscription'}
                          </div>
                          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                            {sub.id}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--fg)' }}>
                          {sub.priceSnapshot !== undefined ? formatPrice(sub.priceSnapshot) : '—'}
                        </td>
                        <td>
                          {sub.durationMonths
                            ? `${sub.durationMonths} ${sub.durationMonths === 1 ? 'month' : 'months'}`
                            : '—'}
                        </td>
                        <td>{formatDate(sub.startDate)}</td>
                        <td>{formatDate(sub.endDate)}</td>
                        <td>
                          <span
                            className={`badge ${
                              isSubActive
                                ? 'badge-success'
                                : isSubExpired
                                ? 'badge-error'
                                : sub.status === 'pending'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {isSubActive ? 'Active' : isSubExpired ? 'Expired' : sub.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              <p style={{ color: 'var(--fg-tertiary)', fontSize: 'var(--text-sm)', margin: 0 }}>
                No previous subscriptions found.
              </p>
            </div>
          )}
        </div>

        {/* Webhook Status */}
        <div className="dashboard-section animate-fade-in-up delay-3">
          <h2>Webhooks</h2>
          <div className="grid grid-2">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <span className={`status-dot ${webhooks?.openResultWebhook?.url ? 'active' : 'inactive'}`}></span>
                <span className="card-title">Open Result Webhook</span>
              </div>
              <p className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)', wordBreak: 'break-all' }}>
                {webhooks?.openResultWebhook?.url || 'Not configured'}
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <span className={`status-dot ${webhooks?.closeResultWebhook?.url ? 'active' : 'inactive'}`}></span>
                <span className="card-title">Close Result Webhook</span>
              </div>
              <p className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)', wordBreak: 'break-all' }}>
                {webhooks?.closeResultWebhook?.url || 'Not configured'}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link href="/dashboard/webhooks" className="btn btn-secondary btn-sm">
              Configure Webhooks
            </Link>
          </div>
        </div>

        {/* Available Markets Schedule */}
        <div className="dashboard-section animate-fade-in-up delay-4">
          <h2>Available Markets Schedule</h2>
          <AvailableMarkets showTitle={false} results={userResults} />
        </div>

        {/* Webhook Delivery Results */}
        <div className="dashboard-section animate-fade-in-up delay-5">
          <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <h2>Webhook Results Status</h2>
              <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                Live delivery status (Pass / Fail) for your configured webhook endpoints
              </p>
            </div>
            {Object.keys(userResults).length > 0 && (
              <div className="flex items-center gap-2">
                <span className="badge badge-success" style={{ fontSize: '11px', fontWeight: 600 }}>
                  {Object.values(userResults).filter((v) => String(v).toLowerCase() === 'pass').length} Passed
                </span>
                {Object.values(userResults).filter((v) => String(v).toLowerCase() === 'fail').length > 0 && (
                  <span className="badge badge-error" style={{ fontSize: '11px', fontWeight: 600 }}>
                    {Object.values(userResults).filter((v) => String(v).toLowerCase() === 'fail').length} Failed
                  </span>
                )}
              </div>
            )}
          </div>

          {Object.keys(userResults).length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Market Event</th>
                    <th>Type</th>
                    <th>Result Key</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(userResults).map(([key, val]) => {
                    const isPass = String(val).toLowerCase() === 'pass';
                    const isClose = key.toLowerCase().includes('close');
                    const isOpen = key.toLowerCase().includes('open');
                    const eventType = isClose ? 'Close Result' : isOpen ? 'Open Result' : 'Event';
                    const cleanName = key
                      .replace(/_open|_close/gi, '')
                      .replace(/_/g, ' ')
                      .toUpperCase();

                    return (
                      <tr key={key}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--fg)' }}>
                            {cleanName}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${isOpen ? 'badge-neutral' : 'badge-warning'}`}
                            style={{ fontSize: '11px' }}
                          >
                            {eventType}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>
                            {key}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={`badge ${isPass ? 'badge-success' : 'badge-error'}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '11px',
                            }}
                          >
                            <span
                              className={`status-dot ${isPass ? 'active' : 'expired'}`}
                              style={{ width: '6px', height: '6px', marginRight: 0 }}
                            ></span>
                            {String(val).toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3 style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                No Webhook Results Dispatched Yet
              </h3>
              <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                When market open or close results are dispatched to your webhook URL, their delivery status (Pass / Fail) will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section animate-fade-in-up delay-6">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link href="/dashboard/plans" className="btn btn-secondary">
              {subscription ? 'Change Plan' : 'View Plans'}
            </Link>
            <Link href="/dashboard/payments" className="btn btn-secondary">
              Payment History
            </Link>
            <Link href="/dashboard/webhooks" className="btn btn-secondary">
              Webhook Settings
            </Link>
          </div>
        </div>

        {/* Real-time Payment Success Pop-up */}
        {showSuccessModal && (
          <PaymentSuccessModal
            subscription={subscription}
            onClose={() => setShowSuccessModal(false)}
          />
        )}
      </div>
    </div>
  );
}
