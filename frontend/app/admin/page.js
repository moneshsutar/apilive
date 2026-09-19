'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminRoute from '@/app/components/AdminRoute';
import { useAuth } from '@/app/lib/auth-context';
import { getAdminStats, expireSubscriptions } from '@/app/lib/api';

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminContent />
    </AdminRoute>
  );
}

function AdminContent() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expiring, setExpiring] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const token = await getToken();
      const res = await getAdminStats(token);
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleExpireSubscriptions = async () => {
    setExpiring(true);
    try {
      const token = await getToken();
      const res = await expireSubscriptions(token);
      alert(`Expired ${res.expired} subscriptions`);
      fetchStats();
    } catch (err) {
      alert('Failed to expire subscriptions: ' + err.message);
    } finally {
      setExpiring(false);
    }
  };

  const formatRevenue = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

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
        <div className="page-header animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1>Admin Dashboard</h1>
              <p>Platform overview and management</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExpireSubscriptions}
              disabled={expiring}
            >
              {expiring ? 'Expiring...' : 'Run Expiry Check'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid animate-fade-in-up delay-1" style={{ marginBottom: 'var(--space-10)' }}>
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats?.totalUsers?.toLocaleString() || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Subscriptions</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {stats?.activeSubscriptions?.toLocaleString() || 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Expired Subscriptions</div>
            <div className="stat-value" style={{ color: 'var(--fg-tertiary)' }}>
              {stats?.expiredSubscriptions?.toLocaleString() || 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{formatRevenue(stats?.totalRevenue)}</div>
            <div className="stat-sub">from {stats?.totalPayments || 0} payments</div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="dashboard-section animate-fade-in-up delay-2">
          <h2>Management</h2>
          <div className="grid grid-2">
            <Link href="/admin/users" className="card" style={{ textDecoration: 'none' }}>
              <div className="flex items-center gap-4">
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)' }}>Users</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-tertiary)' }}>
                    View and manage all platform users
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/subscriptions" className="card" style={{ textDecoration: 'none' }}>
              <div className="flex items-center gap-4">
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)' }}>Subscriptions</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-tertiary)' }}>
                    Active and expired subscription management
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
