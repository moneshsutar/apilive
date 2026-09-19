'use client';

/**
 * Plan Card Component
 * Displays a subscription plan with price, features, and CTA
 */
export default function PlanCard({ plan, featured = false, onSelect, loading = false }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const monthlyPrice = (price, months) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((price || 0) / months);
  };

  return (
    <div className={`plan-card ${featured ? 'featured' : ''}`}>
      {featured && <span className="plan-badge">Popular</span>}

      <h3 className="plan-name">{plan.name}</h3>

      <div className="plan-price">
        {formatPrice(plan.price)}
        <span> / {plan.durationMonths === 1 ? 'month' : `${plan.durationMonths} months`}</span>
      </div>

      {plan.durationMonths > 1 && (
        <p className="plan-duration">
          {monthlyPrice(plan.price, plan.durationMonths)}/month
        </p>
      )}

      <div className="plan-features">
        {plan.features?.map((feature, index) => (
          <div key={index} className="plan-feature">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {feature}
          </div>
        ))}
      </div>

      <button
        className={`btn ${featured ? 'btn-primary' : 'btn-secondary'} w-full`}
        onClick={() => onSelect?.(plan)}
        disabled={loading}
      >
        {loading ? (
          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
        ) : (
          'Select Plan'
        )}
      </button>
    </div>
  );
}
