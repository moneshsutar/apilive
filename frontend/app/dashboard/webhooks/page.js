'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/lib/auth-context';
import { getWebhookConfig, updateWebhookConfig } from '@/app/lib/api';

export default function WebhooksPage() {
  return (
    <ProtectedRoute>
      <WebhooksContent />
    </ProtectedRoute>
  );
}

function WebhooksContent() {
  const { getToken } = useAuth();
  const [openUrl, setOpenUrl] = useState('');
  const [closeUrl, setCloseUrl] = useState('');
  const [status, setStatus] = useState('inactive');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const token = await getToken();
        const res = await getWebhookConfig(token);
        const config = res.webhookConfig;

        setOpenUrl(config?.openResultWebhook?.url || '');
        setCloseUrl(config?.closeResultWebhook?.url || '');
        setStatus(config?.status || 'inactive');
      } catch (err) {
        console.error('Failed to fetch webhook config:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [getToken]);

  const handleSave = async () => {
    setMessage({ type: '', text: '' });

    // Frontend validation (backend validates too)
    if (openUrl && !openUrl.startsWith('http://') && !openUrl.startsWith('https://')) {
      return setMessage({ type: 'error', text: 'Open Result Webhook URL must start with http:// or https://' });
    }
    if (closeUrl && !closeUrl.startsWith('http://') && !closeUrl.startsWith('https://')) {
      return setMessage({ type: 'error', text: 'Close Result Webhook URL must start with http:// or https://' });
    }

    setSaving(true);

    try {
      const token = await getToken();
      await updateWebhookConfig(token, {
        openResultWebhookUrl: openUrl.trim(),
        closeResultWebhookUrl: closeUrl.trim(),
      });

      setStatus(openUrl || closeUrl ? 'active' : 'inactive');
      setMessage({ type: 'success', text: 'Webhook configuration saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save webhook configuration' });
    } finally {
      setSaving(false);
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
      <div className="container" style={{ maxWidth: '640px' }}>
        <div className="page-header animate-fade-in">
          <h1>Webhook Configuration</h1>
          <p>Configure your endpoints to receive API results</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type} mb-6 animate-slide-down`}>
            {message.text}
          </div>
        )}

        <div className="card animate-fade-in-up delay-1">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="card-title">Webhook Endpoints</h3>
              <div className="flex items-center gap-2">
                <span className={`status-dot ${status === 'active' ? 'active' : 'inactive'}`}></span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)', textTransform: 'uppercase' }}>
                  {status}
                </span>
              </div>
            </div>
            <p className="card-description">
              Endpoints receive live market result notifications via POST requests.{' '}
              <Link href="/docs" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>
                View API Documentation &rarr;
              </Link>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="input-group">
              <label htmlFor="openWebhook">
                <span className="flex items-center gap-2">
                  <span className="status-dot active" style={{ animation: 'none', boxShadow: 'none' }}></span>
                  Open Result Webhook URL
                </span>
              </label>
              <input
                id="openWebhook"
                type="url"
                className="input"
                placeholder="https://your-server.com/api/open-result"
                value={openUrl}
                onChange={(e) => setOpenUrl(e.target.value)}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>
                Receives open result data via POST request
              </span>
            </div>

            <div className="input-group">
              <label htmlFor="closeWebhook">
                <span className="flex items-center gap-2">
                  <span className="status-dot expired" style={{ animation: 'none' }}></span>
                  Close Result Webhook URL
                </span>
              </label>
              <input
                id="closeWebhook"
                type="url"
                className="input"
                placeholder="https://your-server.com/api/close-result"
                value={closeUrl}
                onChange={(e) => setCloseUrl(e.target.value)}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>
                Receives close result data via POST request
              </span>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="card mt-6 animate-fade-in-up delay-2">
          <h4 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
            Security Requirements
          </h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              'Supports both HTTP and HTTPS endpoint URLs',
              'Results are delivered immediately via POST requests',
              'Endpoints can be updated or changed at any time',
              'Failed deliveries are retried automatically',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
