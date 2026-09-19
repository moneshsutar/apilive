'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, signOut, loading } = useAuth();

  // Don't show navbar on auth pages
  if (pathname?.startsWith('/auth')) return null;

  const isActive = (path) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link href="/" className="navbar-brand">
          <div className="navbar-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          API Results
        </Link>

        {/* Links */}
        <div className="navbar-links">
          {user && (
            <>
              <Link
                href="/dashboard/plans"
                className={`navbar-link ${isActive('/dashboard/plans') || isActive('/dashboard/checkout') ? 'active' : ''}`}
              >
                Plans
              </Link>
              <Link
                href="/dashboard/payments"
                className={`navbar-link ${isActive('/dashboard/payments') ? 'active' : ''}`}
              >
                Payments
              </Link>
              <Link
                href="/dashboard/webhooks"
                className={`navbar-link ${isActive('/dashboard/webhooks') ? 'active' : ''}`}
              >
                Webhooks
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`navbar-link ${isActive('/admin') ? 'active' : ''}`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
          <Link
            href="/docs"
            className={`navbar-link ${isActive('/docs') ? 'active' : ''}`}
          >
            Documentation
          </Link>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {loading ? null : user ? (
            <>
              {/* Profile Icon button leading to Overview /dashboard */}
              <Link
                href="/dashboard"
                title={user.displayName || user.email || 'Overview'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  border: isActive('/dashboard') && !isActive('/dashboard/plans') && !isActive('/dashboard/payments') && !isActive('/dashboard/webhooks') && !isActive('/dashboard/checkout')
                    ? '1px solid var(--fg)'
                    : '1px solid var(--border)',
                  color: 'var(--fg)',
                  transition: 'all var(--transition)',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
              <button onClick={signOut} className="btn btn-ghost btn-sm">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="btn btn-ghost btn-sm">
                Sign In
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
