'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminRoute from '@/app/components/AdminRoute';
import { useAuth } from '@/app/lib/auth-context';
import { getAdminSubscriptions } from '@/app/lib/api';

export default function AdminSubscriptionsPage() {
  return (
    <AdminRoute>
      <SubscriptionsContent />
    </AdminRoute>
  );
}

function SubscriptionsContent() {
  const { getToken } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    setSubscriptions([]);
    setLastDocId(null);
    fetchSubscriptions();
  }, [activeTab]);

  async function fetchSubscriptions(startAfter = null) {
    try {
      const isLoadMore = !!startAfter;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const token = await getToken();
      const params = { limit: '25', status: activeTab };
      if (startAfter) params.startAfter = startAfter;

      const res = await getAdminSubscriptions(token, params);

      if (isLoadMore) {
        setSubscriptions((prev) => [...prev, ...(res.subscriptions || [])]);
      } else {
        setSubscriptions(res.subscriptions || []);
      }

      setHasMore(res.hasMore);
      setLastDocId(res.lastDocId);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

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

  const getDaysInfo = (sub) => {
    if (!sub.endDate) return '—';
    const end = sub.endDate._seconds
      ? new Date(sub.endDate._seconds * 1000)
      : new Date(sub.endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (diff > 0) return `${diff} days left`;
    if (diff === 0) return 'Expires today';
    return `Expired ${Math.abs(diff)} days ago`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header animate-fade-in">
          <Link href="/admin" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
            ← Back to Admin
          </Link>
          <h1>Subscriptions</h1>
          <p>Manage active and expired subscriptions</p>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <span className="flex items-center gap-2">
                <span className="status-dot active" style={{ marginRight: 0 }}></span>
                Active
              </span>
            </button>
            <button
              className={`tab ${activeTab === 'expired' ? 'active' : ''}`}
              onClick={() => setActiveTab('expired')}
            >
              <span className="flex items-center gap-2">
                <span className="status-dot expired" style={{ marginRight: 0 }}></span>
                Expired
              </span>
            </button>
            <button
              className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <span className="flex items-center gap-2">
                <span className="status-dot pending" style={{ marginRight: 0 }}></span>
                Pending
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '40vh' }}>
            <div className="spinner spinner-lg"></div>
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="animate-fade-in-up delay-1">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--fg)' }}>
                            {sub.user?.displayName || '—'}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)' }}>
                            {sub.user?.email || sub.userId}
                          </div>
                        </div>
                      </td>
                      <td>{sub.planNameSnapshot || sub.planId}</td>
                      <td style={{ fontWeight: 500 }}>
                        {formatPrice(sub.priceSnapshot)}
                      </td>
                      <td>{formatDate(sub.startDate)}</td>
                      <td>{formatDate(sub.endDate)}</td>
                      <td>
                        <span className={`badge ${
                          sub.status === 'active' ? 'badge-success' :
                          sub.status === 'expired' ? 'badge-error' :
                          sub.status === 'pending' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)' }}>
                        {getDaysInfo(sub)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchSubscriptions(lastDocId)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state animate-fade-in">
            <h3>No {activeTab} Subscriptions</h3>
            <p>No subscriptions found with the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
