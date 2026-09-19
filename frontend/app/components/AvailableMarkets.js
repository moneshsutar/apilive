'use client';

import { useState } from 'react';

const MARKETS_DATA = [
  { id: 0, name: 'KARNATAKA DAY', openStart: '10:25 AM', openEnd: '10:59 AM', closeStart: '11:25 AM', closeEnd: '11:59 AM' },
  { id: 1, name: 'MILAN MORNING', openStart: '10:39 AM', openEnd: '10:59 AM', closeStart: '11:39 AM', closeEnd: '11:59 AM' },
  { id: 2, name: 'SRIDEVI', openStart: '11:45 AM', openEnd: '11:59 AM', closeStart: '12:45 PM', closeEnd: '12:59 PM' },
  { id: 3, name: 'TIME BAZAR', openStart: '01:11 PM', openEnd: '01:41 PM', closeStart: '02:11 PM', closeEnd: '02:41 PM' },
  { id: 4, name: 'MADHUR DAY', openStart: '01:40 PM', openEnd: '01:59 PM', closeStart: '02:40 PM', closeEnd: '02:59 PM' },
  { id: 5, name: 'RAJDHANI DAY', openStart: '03:18 PM', openEnd: '03:48 PM', closeStart: '05:18 PM', closeEnd: '05:48 PM' },
  { id: 6, name: 'MILAN DAY', openStart: '03:18 PM', openEnd: '03:48 PM', closeStart: '05:15 PM', closeEnd: '05:45 PM' },
  { id: 7, name: 'SUPREME DAY', openStart: '03:50 PM', openEnd: '04:20 PM', closeStart: '05:50 PM', closeEnd: '06:20 PM' },
  { id: 8, name: 'KALYAN', openStart: '04:00 PM', openEnd: '04:40 PM', closeStart: '06:00 PM', closeEnd: '06:40 PM' },
  { id: 9, name: 'SRIDEVI NIGHT', openStart: '07:28 PM', openEnd: '07:48 PM', closeStart: '08:28 PM', closeEnd: '08:48 PM' },
  { id: 10, name: 'MADHUR NIGHT', openStart: '08:40 PM', openEnd: '08:58 PM', closeStart: '10:40 PM', closeEnd: '10:58 PM' },
  { id: 11, name: 'SUPREME NIGHT', openStart: '08:56 PM', openEnd: '09:24 PM', closeStart: '10:58 PM', closeEnd: '11:28 PM' },
  { id: 12, name: 'MILAN NIGHT', openStart: '09:13 PM', openEnd: '09:43 PM', closeStart: '11:13 PM', closeEnd: '11:43 PM' },
  { id: 14, name: 'RAJDHANI NIGHT', openStart: '09:40 PM', openEnd: '09:58 PM', closeStart: '11:50 PM', closeEnd: '11:58 PM' },
  { id: 15, name: 'MAIN BAZAR', openStart: '09:58 PM', openEnd: '10:25 PM', closeStart: '12:05 AM (Next Day)', closeEnd: '12:35 AM (Next Day)' },
  { id: 16, name: 'MAIN BAZAR MORNING', openStart: '11:28 AM', openEnd: '11:58 AM', closeStart: '12:28 PM', closeEnd: '12:58 PM' },
  { id: 17, name: 'KALYAN NIGHT', openStart: '09:43 PM', openEnd: '09:58 PM', closeStart: '11:43 PM', closeEnd: '11:58 PM' },
].sort((a, b) => a.id - b.id);

export default function AvailableMarkets({ showTitle = true, results = null }) {
  const [search, setSearch] = useState('');

  const filtered = MARKETS_DATA.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toString().includes(search)
  );

  const getStatus = (market, type) => {
    if (!results) return null;
    const nameKey = `${market.name.toLowerCase().replace(/\s+/g, '_')}_${type}`;
    const idKey = `${market.id}_${type}`;
    return results[nameKey] || results[idKey] || null;
  };

  return (
    <section className="animate-fade-in" style={{ marginTop: showTitle ? 'var(--space-12)' : 0, marginBottom: showTitle ? 'var(--space-16)' : 0 }}>
      {showTitle && (
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <span className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>
            Live API Webhook Schedule
          </span>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Available Markets & Result Windows
          </h2>
          <p style={{ color: 'var(--fg-secondary)', maxWidth: '600px', margin: 'var(--space-2) auto 0', fontSize: 'var(--text-sm)' }}>
            Results for both Open and Close events are automatically dispatched to your configured webhooks during these designated windows.
          </p>
        </div>
      )}

      {/* Card wrapper */}
      <div className="card" style={{ padding: 'var(--space-6)', overflow: 'hidden' }}>
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fg-secondary)' }}>
              Daily Market Schedule
            </span>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <input
              type="text"
              placeholder="Search market by name or ID..."
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: '36px',
                paddingLeft: '32px',
                fontSize: 'var(--text-xs)',
              }}
            />
            <svg
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--fg-tertiary)',
                pointerEvents: 'none',
              }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ width: '80px' }}>Game ID</th>
                <th>Market Name</th>
                <th>Open Start</th>
                <th>Open End</th>
                <th>Close Start</th>
                <th>Close End</th>
                {results && <th>Open Status</th>}
                {results && <th>Close Status</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((market) => {
                const openStatus = getStatus(market, 'open');
                const closeStatus = getStatus(market, 'close');

                return (
                  <tr key={market.id}>
                    <td>
                      <span
                        className="badge badge-neutral font-mono"
                        style={{ fontSize: '11px', fontWeight: 600 }}
                      >
                        #{market.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
                        {market.name}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-xs)' }}>
                        {market.openStart}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '11px', color: 'var(--fg)' }}>
                        {market.openEnd}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-xs)' }}>
                        {market.closeStart}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '11px',
                          background: market.closeEnd.includes('Next Day') ? 'var(--warning-bg)' : 'var(--bg-elevated)',
                          color: market.closeEnd.includes('Next Day') ? 'var(--warning)' : 'var(--fg)',
                        }}
                      >
                        {market.closeEnd}
                      </span>
                    </td>
                    {results && (
                      <td>
                        {openStatus ? (
                          <span
                            className={`badge ${openStatus.toLowerCase() === 'pass' ? 'badge-success' : 'badge-error'}`}
                            style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}
                          >
                            {openStatus}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--text-xs)' }}>—</span>
                        )}
                      </td>
                    )}
                    {results && (
                      <td>
                        {closeStatus ? (
                          <span
                            className={`badge ${closeStatus.toLowerCase() === 'pass' ? 'badge-success' : 'badge-error'}`}
                            style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}
                          >
                            {closeStatus}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--text-xs)' }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={results ? 8 : 6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--fg-tertiary)' }}>
                    No markets found matching &quot;{search}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
