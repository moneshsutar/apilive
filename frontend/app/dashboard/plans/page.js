'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import PlanCard from '@/app/components/PlanCard';
import { useAuth } from '@/app/lib/auth-context';
import { getPlans } from '@/app/lib/api';

export default function PlansPage() {
  return (
    <ProtectedRoute>
      <PlansContent />
    </ProtectedRoute>
  );
}

function PlansContent() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await getPlans();
        setPlans(res.plans || []);
      } catch (err) {
        setError('Failed to load plans');
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    // Navigate to checkout with selected plan
    router.push(`/dashboard/checkout?planId=${plan.id}`);
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
        <div className="page-header animate-fade-in" style={{ textAlign: 'center' }}>
          <h1>Choose Your Plan</h1>
          <p>Select a plan to start receiving API results via webhooks</p>
        </div>

        {error && <div className="alert alert-error mb-6">{error}</div>}

        <div className="grid grid-3" style={{ maxWidth: '960px', margin: '0 auto' }}>
          {plans.map((plan, index) => (
            <div key={plan.id} className={`animate-fade-in-up delay-${index + 1}`}>
              <PlanCard
                plan={plan}
                featured={plan.id === 'six_month'}
                onSelect={handleSelectPlan}
              />
            </div>
          ))}
        </div>

        {plans.length === 0 && !error && (
          <div className="empty-state">
            <h3>No Plans Available</h3>
            <p>Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
