'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/lib/auth-context';
import { getPlans, createSubscription, createPaymentOrder } from '@/app/lib/api';

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="loading-container"><div className="spinner spinner-lg"></div></div>}>
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  const router = useRouter();
  const { getToken } = useAuth();

  const [plan, setPlan] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      if (!planId) {
        router.push('/dashboard/plans');
        return;
      }

      try {
        const res = await getPlans();
        const selectedPlan = res.plans?.find((p) => p.id === planId);
        if (!selectedPlan) {
          router.push('/dashboard/plans');
          return;
        }
        setPlan(selectedPlan);

        // Default start date: today
        const today = new Date();
        setStartDate(today.toISOString().split('T')[0]);
      } catch (err) {
        setError('Failed to load plan details');
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [planId, router]);

  const getEndDate = () => {
    if (!startDate || !plan) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + plan.durationMonths);
    end.setDate(end.getDate() - 1);
    return end.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
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

  const handlePayment = async () => {
    setError('');
    setProcessing(true);

    try {
      const token = await getToken();
      const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Create payment order & single subscription directly with DB plan price (single fast call)
      const orderRes = await createPaymentOrder(token, {
        subscriptionId: subId,
        planId: plan?.id || planId,
        planName: plan?.name,
        amount: plan?.price,
        durationMonths: plan?.durationMonths,
        startDate,
      });

      // Step 3: Redirect to UPI payment gateway scanner immediately!
      const paymentUrl = orderRes.payment_url || orderRes.paymentUrl || orderRes.url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to process payment');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page">
        <div className="container">
          <div className="card animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: 'var(--space-10)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Payment Order Created</h2>
            <p style={{ marginBottom: 'var(--space-6)' }}>
              Your payment order has been created. Complete the UPI payment to activate your subscription.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
              <Link href="/dashboard/payments" className="btn btn-secondary">
                View Payments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header animate-fade-in">
          <Link href="/dashboard/plans" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
            ← Back to Plans
          </Link>
          <h1>Checkout</h1>
          <p>Complete your subscription purchase</p>
        </div>

        {error && <div className="alert alert-error mb-6">{error}</div>}

        <div className="checkout-layout">
          {/* Left — Form */}
          <div className="animate-fade-in-up delay-1">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Select Start Date</h3>
                <p className="card-description">
                  Choose when your subscription should begin
                </p>
              </div>

              <div className="input-group">
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {startDate && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>End Date</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{getEndDate()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Duration</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {plan?.durationMonths} {plan?.durationMonths === 1 ? 'month' : 'months'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="card mt-6">
              <div className="card-header">
                <h3 className="card-title">Payment Method</h3>
              </div>
              <div className="flex items-center gap-3" style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: 40, height: 40, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>UPI Payment</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)' }}>
                    Pay securely via UPI
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Summary */}
          <div className="checkout-summary animate-fade-in-up delay-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Order Summary</h3>
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div className="flex justify-between mb-2">
                  <span style={{ fontSize: 'var(--text-sm)' }}>{plan?.name} Plan</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {formatPrice(plan?.price)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-tertiary)' }}>Duration</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-tertiary)' }}>
                    {plan?.durationMonths} {plan?.durationMonths === 1 ? 'month' : 'months'}
                  </span>
                </div>
              </div>

              <hr className="divider" />

              <div className="flex justify-between" style={{ marginBottom: 'var(--space-6)' }}>
                <span style={{ fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {formatPrice(plan?.price)}
                </span>
              </div>

              <button
                className="btn btn-primary w-full btn-lg"
                onClick={handlePayment}
                disabled={processing || !startDate}
              >
                {processing ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                    Processing...
                  </>
                ) : (
                  `Pay ${formatPrice(plan?.price)}`
                )}
              </button>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
                Payment is processed securely. Subscription activates after successful payment verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
