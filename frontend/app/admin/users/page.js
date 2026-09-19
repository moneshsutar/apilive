'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminRoute from '@/app/components/AdminRoute';
import { useAuth } from '@/app/lib/auth-context';
import { getAdminUsers } from '@/app/lib/api';

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <UsersContent />
    </AdminRoute>
  );
}

function UsersContent() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  async function fetchUsers(startAfter = null) {
    try {
      const isLoadMore = !!startAfter;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const token = await getToken();
      const params = { limit: '25' };
      if (startAfter) params.startAfter = startAfter;
      if (statusFilter) params.status = statusFilter;

      const res = await getAdminUsers(token, params);

      if (isLoadMore) {
        setUsers((prev) => [...prev, ...(res.users || [])]);
      } else {
        setUsers(res.users || []);
      }

      setHasMore(res.hasMore);
      setLastDocId(res.lastDocId);
    } catch (err) {
      console.error('Failed to fetch users:', err);
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

  const getSubStatus = (user) => {
    if (!user.subscription) return { label: 'No Plan', badge: 'badge-neutral' };

    const sub = user.subscription;
    const now = new Date();
    const end = sub.endDate?._seconds
      ? new Date(sub.endDate._seconds * 1000)
      : new Date(sub.endDate);

    if (sub.status === 'active' && end > now) {
      return { label: 'Active', badge: 'badge-success' };
    }
    if (sub.status === 'expired' || end <= now) {
      return { label: 'Expired', badge: 'badge-error' };
    }
    return { label: sub.status, badge: 'badge-warning' };
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
          <Link href="/admin" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
            ← Back to Admin
          </Link>
          <h1>Users</h1>
          <p>All registered platform users</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="tabs">
            <button
              className={`tab ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              All
            </button>
            <button
              className={`tab ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={`tab ${statusFilter === 'blocked' ? 'active' : ''}`}
              onClick={() => setStatusFilter('blocked')}
            >
              Blocked
            </button>
          </div>
        </div>

        {users.length > 0 ? (
          <div className="animate-fade-in-up delay-1">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Subscription</th>
                    <th>Plan</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const subStatus = getSubStatus(user);
                    return (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: 500, color: 'var(--fg)' }}>
                          {user.displayName || '—'}
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${subStatus.badge}`}>{subStatus.label}</span>
                        </td>
                        <td style={{ fontSize: 'var(--text-sm)' }}>
                          {user.subscription?.planNameSnapshot || '—'}
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchUsers(lastDocId)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state animate-fade-in">
            <h3>No Users Found</h3>
            <p>No users match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
