'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';

/* ---------------- Normalizers (field name যাই আসুক) ---------------- */

function normalizeAnalytics(res) {
  const d = res?.data ?? res ?? {};
  const users = d.users ?? {};
  const requests = d.requests ?? {};
  const donations = d.donations ?? {};
  const queues = d.queues ?? {};

  // Doc: requests = { active, sosActive, completed, cancelled, expired, total } (no byStatus array)
  const requestsByStatus = Array.isArray(requests.byStatus)
    ? requests.byStatus
    : [
        { status: 'active', count: requests.active ?? 0 },
        { status: 'completed', count: requests.completed ?? 0 },
        { status: 'cancelled', count: requests.cancelled ?? 0 },
        { status: 'expired', count: requests.expired ?? 0 },
      ].filter((s) => (s.count ?? 0) > 0 || s.status === 'active' || s.status === 'completed');

  return {
    totalUsers: users.total ?? d.totalUsers ?? 0,
    totalDonors: users.donors ?? d.totalDonors ?? 0,
    activeDonors: users.activeDonors ?? users.active ?? 0,
    verifiedDonors: users.verified ?? d.verifiedDonors ?? 0,
    totalRequests: requests.total ?? d.totalRequests ?? 0,
    sosActive: requests.sosActive ?? requests.sos ?? 0,
    requestsByStatus,
    totalDonations: donations.total ?? d.totalDonations ?? 0,
    donationsThisMonth: donations.thisMonth ?? 0,
    bloodGroups: d.bloodGroupDistribution ?? d.bloodGroups ?? [],
    divisions: d.divisionDistribution ?? [],
    registrationsDaily: d.registrations?.daily ?? [],
    pendingVerifications: queues.pendingVerifications ?? d.pendingVerifications ?? 0,
    pendingReports: queues.pendingReports ?? d.pendingReports ?? 0,
  };
}

function formatMemory(m) {
  if (m == null) return '—';
  if (typeof m === 'number') return `${m} MB`;
  const rss = m.rss;
  const heap = m.heapUsed ?? m.used;
  // Prefer heapUsed; fall back to rss. Values are MB in doc examples but handle bytes defensively.
  const v = heap ?? rss;
  if (v == null) return '—';
  return typeof v === 'number' && v > 1048576 ? `${Math.round(v / 1048576)} MB` : `${v} MB`;
}

function normalizeHealth(res) {
  const d = res?.data ?? res ?? {};
  const database = d.database;
  const dbState =
    typeof database === 'string'
      ? database
      : database?.status ?? database?.state ?? d.dbState ?? 'unknown';
  const notifications = d.notifications24h ?? d.last24h ?? {};
  return {
    dbState,
    uptime: d.uptime ?? d.api?.uptime ?? '—',
    onlineUsers: d.socket?.onlineUsers ?? d.onlineUsers ?? 0,
    pushes: notifications.pushSent ?? notifications.pushes ?? 0,
    emails: notifications.emailsSent ?? notifications.emails ?? 0,
    memoryMB: d.memoryMB ?? null,
    cronJobs: Array.isArray(d.cronJobs) ? d.cronJobs : [],
  };
}

/* ---------------- Constants ---------------- */

const BLOOD_ORDER = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

const STATUS_META = {
  searching_donors: { label: 'Searching', color: '#F59E0B' },
  donor_responded: { label: 'Responded', color: '#3B82F6' },
  donor_confirmed: { label: 'Confirmed', color: '#8B5CF6' },
  blood_arranged: { label: 'Arranged', color: '#6366F1' },
  completed: { label: 'Completed', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF' },
  rejected: { label: 'Rejected', color: '#EF4444' },
  expired: { label: 'Expired', color: '#D1D5DB' },
};

const CRON_LABELS = {
  requestExpiry: 'Request Expiry',
  cooldownReminder: 'Cooldown Reminder',
  sosEscalation: 'SOS Escalation',
};

/* ---------------- Page ---------------- */

export default function DashboardPage() {
  const [a, setA] = useState(null); // analytics
  const [h, setH] = useState(null); // health
  const [healthDenied, setHealthDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    const [analyticsRes, healthRes] = await Promise.allSettled([
      api.get('/admin/analytics/dashboard'),
      api.get('/admin/system/health'),
    ]);

    if (analyticsRes.status === 'fulfilled') {
      setA(normalizeAnalytics(analyticsRes.value));
    } else {
      setError(analyticsRes.reason?.message || 'Failed to load analytics.');
    }

    if (healthRes.status === 'fulfilled') {
      setH(normalizeHealth(healthRes.value));
      setHealthDenied(false);
    } else {
      // monitoring permission না থাকলে lock card দেখাবো
      setHealthDenied(true);
    }

    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000); // ৩০ সেকেন্ডে silent refresh
    return () => clearInterval(t);
  }, [load]);

  /* ---------- Loading skeleton ---------- */
  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-56 animate-pulse rounded-xl bg-ink/5" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-36 animate-pulse bg-ink/[0.03]" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card h-64 animate-pulse bg-ink/[0.03]" />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Error state ---------- */
  if (error && !a) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-5xl">⚠️</div>
        <h3 className="font-display mt-4 text-lg font-bold text-ink">
          Failed to load dashboard
        </h3>
        <p className="mt-2 text-sm text-ink/50">{error}</p>
        <button onClick={() => load()} className="btn-primary mt-6">
          🔄 Retry
        </button>
      </div>
    );
  }

  const bloodMax = Math.max(...(a?.bloodGroups ?? []).map((b) => b.count ?? 0), 1);
  const statusTotal = (a?.requestsByStatus ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
  const regData = (a?.registrationsDaily ?? []).slice(-7);
  const regMax = Math.max(...regData.map((r) => r.count ?? 0), 1);
  const topDivisions = (a?.divisions ?? []).slice(0, 6);
  const divMax = Math.max(...topDivisions.map((d) => d.count ?? 0), 1);

  const dbOk = h && String(h.dbState).toLowerCase().includes('connect');

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          updatedAt
            ? `Live • updated ${updatedAt.toLocaleTimeString('en-GB')}${
                refreshing ? ' • refreshing…' : ''
              }`
            : 'Live overview'
        }
      >
        <button onClick={() => load()} className="btn-outline !py-2">
          {refreshing ? '⏳ Refreshing…' : '🔄 Refresh'}
        </button>
      </PageHeader>

      {/* 🆘 SOS Alert Banner */}
      {a && a.sosActive > 0 && (
        <Link
          href="/requests"
          className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-4 text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <p className="text-sm font-bold sm:text-base">
              🆘 {a.sosActive} active SOS request{a.sosActive > 1 ? 's' : ''} right now
            </p>
          </div>
          <span className="text-sm font-semibold text-white/90">View →</span>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="👥"
          label="Total Users"
          value={formatNumber(a?.totalUsers)}
          sub={`${formatNumber(a?.totalDonors)} donors registered`}
          accent="blue"
        />
        <StatCard
          icon="🩸"
          label="Donors"
          value={formatNumber(a?.totalDonors)}
          sub={`${formatNumber(a?.activeDonors)} available • ${formatNumber(a?.verifiedDonors)} verified`}
          accent="primary"
        />
        <StatCard
          icon="📋"
          label="Blood Requests"
          value={formatNumber(a?.totalRequests)}
          sub={a?.sosActive ? `⚠️ ${a.sosActive} SOS active` : 'No active SOS'}
          accent="amber"
        />
        <StatCard
          icon="💉"
          label="Donations"
          value={formatNumber(a?.totalDonations)}
          sub={`${formatNumber(a?.donationsThisMonth)} this month`}
          accent="green"
        />
      </div>

      {/* Action Queue */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/verifications"
          className="card flex items-center justify-between p-6 transition hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-2xl">
              🪪
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-ink">
                {formatNumber(a?.pendingVerifications)}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                Pending Verifications
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-primary">Review →</span>
        </Link>

        <Link
          href="/reports"
          className="card flex items-center justify-between p-6 transition hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🚩
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-ink">
                {formatNumber(a?.pendingReports)}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                Pending Reports
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-primary">Review →</span>
        </Link>
      </div>

      {/* Charts row */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Blood Group Distribution */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink">
            🧬 Blood Group Distribution
          </h3>
          <p className="mt-1 text-xs text-ink/40">Donors per blood group</p>

          {a?.bloodGroups?.length > 0 ? (
            <div className="mt-5 space-y-3">
              {BLOOD_ORDER.map((g) => {
                const found = a.bloodGroups.find((b) => b._id === g);
                const count = found?.count ?? 0;
                return (
                  <div key={g} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-bold text-ink">{g}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-700"
                        style={{ width: `${(count / bloodMax) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold text-ink/60">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-8 pb-6 text-center text-sm text-ink/40">
              No donor data yet — chart will appear as donors register.
            </p>
          )}
        </div>

        {/* Request Pipeline */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink">📊 Request Pipeline</h3>
          <p className="mt-1 text-xs text-ink/40">Requests by current status</p>

          {statusTotal > 0 ? (
            <>
              {/* Stacked bar */}
              <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full">
                {a.requestsByStatus.map((s) => {
                  const meta = STATUS_META[s._id] ?? { color: '#9CA3AF' };
                  const pct = ((s.count ?? 0) / statusTotal) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={s._id}
                      title={`${meta.label}: ${s.count}`}
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {a.requestsByStatus.map((s) => {
                  const meta = STATUS_META[s._id] ?? { label: s._id, color: '#9CA3AF' };
                  return (
                    <div key={s._id} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="flex-1 text-xs text-ink/60">{meta.label}</span>
                      <span className="text-xs font-bold text-ink">
                        {formatNumber(s.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-8 pb-6 text-center text-sm text-ink/40">
              No requests yet — pipeline will appear here.
            </p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Registrations — last 7 days */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink">📈 New Registrations</h3>
          <p className="mt-1 text-xs text-ink/40">Last 7 days</p>

          {regData.length > 0 ? (
            <div className="mt-6 flex h-36 items-end gap-3">
              {regData.map((r) => (
                <div key={r._id} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-bold text-ink">{r.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary-light transition-all duration-700"
                    style={{ height: `${Math.max((r.count / regMax) * 100, 6)}%` }}
                    title={`${r._id}: ${r.count}`}
                  />
                  <span className="text-[10px] font-medium text-ink/40">
                    {String(r._id).slice(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 pb-6 text-center text-sm text-ink/40">
              No registration data yet.
            </p>
          )}
        </div>

        {/* Top Divisions */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink">📍 Top Divisions</h3>
          <p className="mt-1 text-xs text-ink/40">Where donors are located</p>

          {topDivisions.length > 0 ? (
            <div className="mt-5 space-y-3">
              {topDivisions.map((d, i) => (
                <div key={d._id ?? i} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm font-medium text-ink">
                    {d._id || 'Unknown'}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-ink/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                      style={{ width: `${((d.count ?? 0) / divMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-ink/60">
                    {formatNumber(d.count)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 pb-6 text-center text-sm text-ink/40">No location data yet.</p>
          )}
        </div>
      </div>

      {/* 🖥️ System Health */}
      <div className="mt-6">
        {healthDenied ? (
          <div className="card flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink/5 text-2xl">
              🔒
            </div>
            <div>
              <p className="font-display font-bold text-ink">System Health</p>
              <p className="text-sm text-ink/50">
                Requires monitoring_admin access — your role can&apos;t view this.
              </p>
            </div>
          </div>
        ) : h ? (
          <div className="card overflow-hidden">
            {/* Status strip */}
            <div
              className={`flex items-center gap-2.5 px-6 py-3.5 ${
                dbOk ? 'bg-green-50' : 'bg-amber-50'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                    dbOk ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    dbOk ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <p
                className={`text-sm font-bold ${
                  dbOk ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                {dbOk ? 'All Systems Operational' : 'System Attention Needed'}
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Uptime
                </p>
                <p className="font-display mt-1 text-lg font-extrabold text-ink">
                  ⏱️ {h.uptime}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Online Users
                </p>
                <p className="font-display mt-1 text-lg font-extrabold text-ink">
                  🟢 {formatNumber(h.onlineUsers)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Last 24h Notifications
                </p>
                <p className="font-display mt-1 text-lg font-extrabold text-ink">
                  📲 {formatNumber(h.pushes)} push • ✉️ {formatNumber(h.emails)} email
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Memory
                </p>
                <p className="font-display mt-1 text-lg font-extrabold text-ink">
                  💾 {formatMemory(h.memoryMB)}
                </p>
              </div>
            </div>

            {h.cronJobs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-ink/5 px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Cron Jobs:
                </span>
                {h.cronJobs.map((job) => (
                  <span
                    key={job}
                    className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                  >
                    ✅ {CRON_LABELS[job] || job}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}