'use client';

import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import AvailableMarkets from './components/AvailableMarkets';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="page">
      <div className="container">
        {/* Hero Section with High-Ranking SEO Heading */}
        <section className="hero animate-fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '4px 14px', borderRadius: '9999px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: 'var(--space-4)' }}>
            <span className="status-dot active"></span>
            Live Matka Results &amp; Real-Time API
          </div>
          <h1>Matka Results — Live Satta Matka Result Today</h1>
          <p>
            Get the fastest live <strong>Matka results</strong> for Kalyan, Milan Day, Milan Night, Rajdhani, Sridevi, and Main Bazar.
            Receive instant open and close patti and single ank numbers delivered straight to your website or app via our high-speed Webhook API.
          </p>
          <div className="hero-actions">
            {loading ? null : user ? (
              <Link href="/dashboard/webhooks" className="btn btn-primary btn-lg">
                Configure Webhooks
              </Link>
            ) : (
              <>
                <Link href="/auth/signup" className="btn btn-primary btn-lg">
                  Get Started Free
                </Link>
                <Link href="/docs" className="btn btn-secondary btn-lg">
                  View API Docs
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Live Available Markets Section */}
        <AvailableMarkets />

        {/* Features */}
        <section className="hero-grid" style={{ marginTop: 'var(--space-16)' }}>
          <div className="feature-card animate-fade-in-up delay-1">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h3>Fastest Live Matka Results</h3>
            <p>Results delivered instantly with sub-second latency the moment opening and closing numbers are declared.</p>
          </div>

          <div className="feature-card animate-fade-in-up delay-2">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3>Secure Webhook API</h3>
            <p>Connect your Node.js, Python, PHP, or Go servers to receive automated JSON POST alerts on every market result.</p>
          </div>

          <div className="feature-card animate-fade-in-up delay-3">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h3>All Top Markets Covered</h3>
            <p>Complete coverage for Kalyan, Milan Day &amp; Night, Rajdhani Day &amp; Night, Time Bazar, and Main Bazar.</p>
          </div>
        </section>

        {/* SEO Rich Content Section: About Matka Results */}
        <section style={{ marginTop: 'var(--space-16)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)', color: 'var(--fg)' }}>
            Real-Time Matka Results &amp; Automated Webhook Feeds
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', lineHeight: '1.7', marginBottom: 'var(--space-4)' }}>
            Welcome to the premier platform for live <strong>Matka results</strong> and automated data integration.
            Whether you are following daily Kalyan Matka open-close results or running your own portal, our robust API infrastructure delivers accurate, verified market numbers without delay.
          </p>
          <div className="grid grid-2" style={{ gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>Top Markets Live Tracking</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-secondary)', lineHeight: '1.6' }}>
                Track live results for <strong>Kalyan</strong>, <strong>Milan Day</strong>, <strong>Milan Night</strong>, <strong>Rajdhani Night</strong>, <strong>Main Bazar</strong>, <strong>Sridevi</strong>, and <strong>Supreme Day</strong>. Never miss an open or close panel announcement.
              </p>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>Automated Developer Integration</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-secondary)', lineHeight: '1.6' }}>
                Easily integrate live <strong>Matka results</strong> with your backend using simple HTTP POST webhooks. We deliver JSON payloads directly to your endpoint so you can update charts, apps, or databases automatically.
              </p>
            </div>
          </div>
        </section>

        {/* SEO FAQ Section (Matches JSON-LD Schema for Google Rich Snippets) */}
        <section style={{ marginTop: 'var(--space-16)' }}>
          <h2 className="text-center" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>
            Frequently Asked Questions — Matka Results
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
                Where can I get the fastest live Matka results today?
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', lineHeight: '1.6', margin: 0 }}>
                You can get instant, verified live <strong>Matka results</strong> right here. Our platform updates open and close panels in real time for all major markets including Kalyan, Milan, and Rajdhani.
              </p>
            </div>

            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
                What time are Kalyan Matka results declared?
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', lineHeight: '1.6', margin: 0 }}>
                The Kalyan Matka Open result is declared between 04:00 PM and 04:40 PM IST, and the Kalyan Close result is declared between 06:00 PM and 06:40 PM IST.
              </p>
            </div>

            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
                How do I receive Matka results directly on my server or application?
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', lineHeight: '1.6', margin: 0 }}>
                You can configure your Open and Close webhook endpoints in your dashboard. Our server immediately delivers JSON POST requests containing <code>gameId</code>, <code>openPanel</code>, <code>openAnk</code>, <code>closePanel</code>, and <code>closeAnk</code> as soon as results are published.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ marginTop: 'var(--space-20)', textAlign: 'center' }}>
          <h2 className="animate-fade-in" style={{ marginBottom: 'var(--space-10)' }}>How It Works</h2>
          <div className="hero-grid">
            <div className="feature-card animate-fade-in-up delay-1">
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 'var(--space-4)' }}>01</div>
              <h3>Create Account</h3>
              <p>Sign up and choose a plan that fits your requirements.</p>
            </div>
            <div className="feature-card animate-fade-in-up delay-2">
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 'var(--space-4)' }}>02</div>
              <h3>Configure Webhooks</h3>
              <p>Set your open and close result webhook URLs in your settings.</p>
            </div>
            <div className="feature-card animate-fade-in-up delay-3">
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 'var(--space-4)' }}>03</div>
              <h3>Receive Live Results</h3>
              <p>Start receiving instant Matka results directly to your endpoints.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ textAlign: 'center', marginTop: 'var(--space-20)', paddingBottom: 'var(--space-8)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-muted)' }}>
            © {new Date().getFullYear()} Matka Results API Platform. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
