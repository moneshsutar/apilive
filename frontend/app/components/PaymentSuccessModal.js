'use client';

import Link from 'next/link';

export default function PaymentSuccessModal({ payment, subscription, onClose, onViewReceipt }) {
  if (!payment && !subscription) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const planName = payment?.planName || subscription?.planNameSnapshot || 'Subscription Plan';
  const amount = payment?.amount;
  const utr = payment?.utr || payment?.gatewayTransactionId;
  const orderId = payment?.gatewayOrderId || payment?.orderId || subscription?.orderId;
  const time = payment?.paymentReceivedTime || 'Just now';

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-card animate-fade-in-up"
        style={{
          maxWidth: '520px',
          padding: 'var(--space-8)',
          textAlign: 'center',
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: '1',
          }}
        >
          ✕
        </button>

        {/* Animated Check Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '2px solid var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <span className="badge badge-success" style={{ marginBottom: 'var(--space-2)' }}>
          Payment Verified & Active
        </span>

        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 'var(--space-2) 0 var(--space-1)' }}>
          Payment Successful! 🎉
        </h2>

        <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
          Your payment was received via UPI and your subscription is now active in real-time.
        </p>

        {/* Summary Card */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            textAlign: 'left',
          }}
        >
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-muted)' }}>Plan</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{planName}</span>
          </div>

          {amount !== undefined && amount !== null && (
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-muted)' }}>Amount Paid</span>
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--success)' }}>
                {formatPrice(amount)}
              </span>
            </div>
          )}

          {orderId && (
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>Order Reference</span>
              <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--fg-secondary)' }}>
                {orderId}
              </span>
            </div>
          )}

          {utr && (
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>UPI Ref / UTR</span>
              <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--fg-secondary)' }}>
                {utr}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>Received At</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>{time}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link href="/dashboard/webhooks" className="btn btn-primary w-full" onClick={onClose}>
            Configure Webhook URLs →
          </Link>

          <div className="flex gap-2">
            {payment?.id && onViewReceipt && (
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => {
                  onClose();
                  onViewReceipt(payment.id);
                }}
              >
                View Receipt
              </button>
            )}
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
