'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import PaymentSuccessModal from '@/app/components/PaymentSuccessModal';
import { useAuth } from '@/app/lib/auth-context';
import { getPaymentHistory, getPaymentReceipt } from '@/app/lib/api';

export default function PaymentsPage() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}

function PaymentsContent() {
  const { getToken } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [successPopupPayment, setSuccessPopupPayment] = useState(null);

  useEffect(() => {
    fetchPayments();

    // Poll every 5 seconds for real-time updates (e.g., waiting for webhook processing)
    const intervalId = setInterval(() => {
      fetchPayments();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  async function fetchPayments(startAfter = null) {
    try {
      const isLoadMore = !!startAfter;
      if (isLoadMore) setLoadingMore(true);

      const token = await getToken();
      if (!token) return;
      const params = { limit: '10' };
      if (startAfter) params.startAfter = startAfter;

      const res = await getPaymentHistory(token, params);
      const items = res.payments || [];

      if (isLoadMore) {
        setPayments((prev) => [...prev, ...items]);
      } else {
        setPayments(items);

        // Real-time detection of successful payment
        if (items.length > 0) {
          const latest = items[0];
          const isSuccess = latest.status === 'success' || latest.paymentstatus === 'success';
          const isPaidParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('paid');
          const storageKey = `ack_payment_${latest.id || latest.orderId || latest.gatewayOrderId}`;
          const alreadyAcked = typeof window !== 'undefined' && sessionStorage.getItem(storageKey);

          if (isSuccess && (isPaidParam || !alreadyAcked)) {
            setSuccessPopupPayment(latest);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(storageKey, 'true');
              if (isPaidParam) {
                window.history.replaceState({}, '', window.location.pathname);
              }
            }
          }
        }
      }

      setHasMore(res.hasMore);
      setLastDocId(res.lastDocId);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handleViewReceipt = async (paymentId) => {
    setReceiptLoading(true);
    try {
      const token = await getToken();
      const res = await getPaymentReceipt(token, paymentId);
      setReceiptModal(res.receipt);
    } catch (err) {
      console.error('Failed to fetch receipt:', err);
    } finally {
      setReceiptLoading(false);
    }
  };

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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <span className="badge badge-success">Success</span>;
      case 'failed':
        return <span className="badge badge-error">Failed</span>;
      case 'refunded':
        return <span className="badge badge-warning">Refunded</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
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
          <h1>Payment History</h1>
          <p>View all your payments and download receipts</p>
        </div>

        {payments.length > 0 ? (
          <div className="animate-fade-in-up delay-1">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Receipt No.</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Gateway</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.paidAt || payment.createdAt)}</td>
                      <td>
                        <span className="font-mono">{payment.receiptNumber || '—'}</span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--fg)' }}>
                        {formatPrice(payment.amount)}
                      </td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td style={{ textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                        {payment.gateway || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleViewReceipt(payment.id)}
                        >
                          View Receipt
                        </button>
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
                  onClick={() => fetchPayments(lastDocId)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state animate-fade-in">
            <h3>No Payments Yet</h3>
            <p>Your payment history will appear here after your first purchase.</p>
          </div>
        )}

        {/* Receipt Modal */}
        {receiptModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: 'var(--space-4)',
            }}
            onClick={() => setReceiptModal(null)}
          >
            <div
              className="card animate-fade-in"
              style={{ maxWidth: '480px', width: '100%', padding: 'var(--space-8)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3>Payment Receipt</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setReceiptModal(null)}>
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="flex justify-between">
                  <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Receipt No.</span>
                  <span className="font-mono" style={{ fontSize: 'var(--text-sm)' }}>
                    {receiptModal.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Date</span>
                  <span style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDate(receiptModal.paidAt || receiptModal.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Amount</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {formatPrice(receiptModal.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Status</span>
                  {getStatusBadge(receiptModal.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Gateway</span>
                  <span style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>
                    {receiptModal.gateway}
                  </span>
                </div>
                {receiptModal.gatewayTransactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Transaction ID</span>
                    <span className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>
                      {receiptModal.gatewayTransactionId}
                    </span>
                  </div>
                )}
              </div>

              <hr className="divider" />

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)', textAlign: 'center' }}>
                API Results Platform — Payment Receipt
              </p>
            </div>
          </div>
        )}

        {/* Real-time Payment Success Pop-up */}
        {successPopupPayment && (
          <PaymentSuccessModal
            payment={successPopupPayment}
            onClose={() => setSuccessPopupPayment(null)}
            onViewReceipt={handleViewReceipt}
          />
        )}
      </div>
    </div>
  );
}
