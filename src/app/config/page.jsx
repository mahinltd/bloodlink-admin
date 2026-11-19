'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import Toggle from '@/components/Toggle';

const TABS = [
  { key: 'config', label: '⚙️ App Config' },
  { key: 'version', label: '📱 App Version' },
];

const TEXT_FIELDS = [
  { key: 'supportEmail', label: 'Support Email', type: 'email', placeholder: 'support@bloodlink.tech' },
  { key: 'supportPhone', label: 'Support Phone', placeholder: '01XXXXXXXXX' },
  { key: 'websiteUrl', label: 'Website URL', placeholder: 'https://bloodlink.tech' },
  { key: 'facebookUrl', label: 'Facebook Page URL', placeholder: 'https://facebook.com/…' },
];

const NUMBER_FIELDS = [
  { key: 'donationCooldownDays', label: 'Donation Cooldown (days)', hint: 'Minimum gap between donations — default 90' },
  { key: 'sosExpiryHours', label: 'SOS Expiry (hours)', hint: 'Default 3' },
  { key: 'urgentExpiryHours', label: 'Urgent Expiry (hours)', hint: 'Default 24' },
  { key: 'regularExpiryHours', label: 'Regular Expiry (hours)', hint: 'Default 72' },
];

const BOOL_FIELDS = [
  { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'App shows a maintenance screen to all users', danger: true },
  { key: 'registrationOpen', label: 'Registration Open', desc: 'Allow new users to sign up' },
  { key: 'notificationsEnabled', label: 'Push Notifications', desc: 'Master switch for outgoing notifications' },
];

function RawPreview({ data }) {
  if (!data) return null;
  return (
    <details className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-gray-500">
        Raw server response (debug — কিছু mismatch লাগলে এটা কপি করে পাঠাবেন)
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto text-[11px] leading-relaxed text-gray-500">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

function Card({ title, children }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-bold text-ink">{title}</h3>
      {children}
    </div>
  );
}

/* ---------------- App Config ---------------- */

function ConfigPanel() {
  const [form, setForm] = useState(null);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      try {
        res = await api.get('/admin/config');
      } catch {
        res = await api.get('/config');
      }
      const cfg = res?.data?.config ?? res?.data ?? {};
      setRaw(cfg);
      const f = {};
      TEXT_FIELDS.forEach(({ key }) => {
        f[key] = cfg[key] ?? '';
      });
      NUMBER_FIELDS.forEach(({ key }) => {
        f[key] = cfg[key] ?? '';
      });
      BOOL_FIELDS.forEach(({ key }) => {
        f[key] = !!cfg[key];
      });
      setForm(f);
    } catch (err) {
      setError(err?.message ?? 'Failed to load config.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {};
      TEXT_FIELDS.forEach(({ key }) => {
        const v = String(form[key] ?? '').trim();
        if (v) payload[key] = v;
      });
      NUMBER_FIELDS.forEach(({ key }) => {
        const n = parseInt(form[key], 10);
        if (!Number.isNaN(n) && n >= 0) payload[key] = n;
      });
      BOOL_FIELDS.forEach(({ key }) => {
        payload[key] = !!form[key];
      });
      await api.put('/admin/config', payload);
      setNotice('Config updated successfully ✓');
      await load();
    } catch (err) {
      setError(err?.message ?? 'Failed to save config.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={load} className="btn-outline mt-3 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      <Card title="📇 Contact & Links">
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{f.label}</label>
              <input
                className="input w-full"
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="🩸 Donation & Request Rules">
        <div className="grid gap-4 sm:grid-cols-2">
          {NUMBER_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{f.label}</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
              <p className="mt-1 text-[11px] text-gray-400">{f.hint}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="🎛 Feature Switches">
        <div className="divide-y divide-gray-50">
          {BOOL_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className={`text-sm font-semibold ${f.danger && form[f.key] ? 'text-red-600' : 'text-ink'}`}>
                  {f.label}
                  {f.danger && form[f.key] && ' — ON ⚠️'}
                </p>
                <p className="text-xs text-gray-400">{f.desc}</p>
              </div>
              <Toggle checked={!!form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
            </div>
          ))}
        </div>
      </Card>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Config'}
        </button>
      </div>

      <RawPreview data={raw} />
    </div>
  );
}

/* ---------------- App Version ---------------- */

const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;

function normalizeVersion(d) {
  const v = d?.version ?? d?.appVersion ?? d ?? {};
  return {
    latestVersion: v?.latestVersion ?? v?.latest?.version ?? '',
    latestVersionCode: v?.latestVersionCode ?? v?.latest?.versionCode ?? '',
    minimumVersion: v?.minimumVersion ?? v?.minimum?.version ?? '',
    minimumVersionCode: v?.minimumVersionCode ?? v?.minimum?.versionCode ?? '',
    downloadUrl: v?.downloadUrl ?? v?.apkUrl ?? '',
    sha256: v?.sha256 ?? v?.sha256Hash ?? '',
    releaseNotes: v?.releaseNotes ?? v?.notes ?? '',
    updatedAt: v?.updatedAt ?? null,
  };
}

function VersionPanel() {
  const [form, setForm] = useState(null);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      try {
        res = await api.get('/admin/app-version');
      } catch {
        res = await api.get('/app-version?versionCode=0');
      }
      const data = res?.data ?? {};
      setRaw(data);
      setForm(normalizeVersion(data));
    } catch (err) {
      setError(err?.message ?? 'Failed to load app version.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const validate = () => {
    const errs = [];
    if (!SEMVER.test(form.latestVersion.trim())) errs.push('Latest version must be semver format (e.g. 1.2.0)');
    if (!SEMVER.test(form.minimumVersion.trim())) errs.push('Minimum version must be semver format (e.g. 1.0.0)');
    const lc = parseInt(form.latestVersionCode, 10);
    const mc = parseInt(form.minimumVersionCode, 10);
    if (!Number.isInteger(lc) || lc < 1) errs.push('Latest version code must be a positive integer');
    if (!Number.isInteger(mc) || mc < 1) errs.push('Minimum version code must be a positive integer');
    if (Number.isInteger(lc) && Number.isInteger(mc) && lc < mc)
      errs.push('Latest version code cannot be lower than minimum version code');
    if (form.sha256.trim() && !SHA256_RE.test(form.sha256.trim()))
      errs.push('SHA-256 must be exactly 64 hex characters');
    setValidationErrors(errs);
    return errs.length === 0;
  };

  const save = async () => {
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        latestVersion: form.latestVersion.trim(),
        latestVersionCode: parseInt(form.latestVersionCode, 10),
        minimumVersion: form.minimumVersion.trim(),
        minimumVersionCode: parseInt(form.minimumVersionCode, 10),
      };
      if (form.downloadUrl.trim()) payload.downloadUrl = form.downloadUrl.trim();
      if (form.sha256.trim()) payload.sha256 = form.sha256.trim();
      if (form.releaseNotes.trim()) payload.releaseNotes = form.releaseNotes.trim();
      await api.put('/admin/app-version', payload);
      setNotice('App version updated ✓ — users will see the update prompt.');
      await load();
    } catch (err) {
      setError(err?.message ?? 'Failed to save app version.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={load} className="btn-outline mt-3 text-sm">
          Retry
        </button>
      </div>
    );
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      {/* current summary */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Latest: v{form.latestVersion || '?'} (code {form.latestVersionCode || '?'})
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          Minimum: v{form.minimumVersion || '?'} (code {form.minimumVersionCode || '?'})
        </span>
        {form.updatedAt && (
          <span className="text-xs text-gray-400">Last updated: {formatDateTime(form.updatedAt)}</span>
        )}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        📱 Users below <strong>minimum</strong> version code get a <strong>force update</strong> screen. Users between
        minimum and latest get an optional update prompt.
      </div>

      <Card title="🆕 Latest Release">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Latest Version (semver)</label>
            <input className="input w-full font-mono" value={form.latestVersion} onChange={set('latestVersion')} placeholder="1.2.0" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Latest Version Code</label>
            <input className="input w-full font-mono" type="number" min="1" value={form.latestVersionCode} onChange={set('latestVersionCode')} placeholder="3" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Minimum Version (semver)</label>
            <input className="input w-full font-mono" value={form.minimumVersion} onChange={set('minimumVersion')} placeholder="1.0.0" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Minimum Version Code</label>
            <input className="input w-full font-mono" type="number" min="1" value={form.minimumVersionCode} onChange={set('minimumVersionCode')} placeholder="1" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">APK Download URL</label>
            <input className="input w-full font-mono text-xs" value={form.downloadUrl} onChange={set('downloadUrl')} placeholder="https://cdn.bloodlink.tech/releases/bloodlink-v1.2.0.apk" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">SHA-256 Checksum</label>
            <input className="input w-full font-mono text-xs" value={form.sha256} onChange={set('sha256')} placeholder="64 hex characters — users verify the APK with this" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Release Notes</label>
            <textarea className="input min-h-[90px] w-full resize-none" value={form.releaseNotes} onChange={set('releaseNotes')} placeholder="What's new in this version…" />
          </div>
        </div>
      </Card>

      {validationErrors.length > 0 && (
        <div className="rounded-xl bg-red-50 px-4 py-3">
          {validationErrors.map((e) => (
            <p key={e} className="text-sm text-red-600">
              • {e}
            </p>
          ))}
        </div>
      )}
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Publish Version'}
        </button>
      </div>

      <RawPreview data={raw} />
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function ConfigPage() {
  const [tab, setTab] = useState('config');

  return (
    <div>
      <PageHeader title="App Settings" subtitle="Remote configuration for the BloodLink app" />

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-ink text-white shadow' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' ? <ConfigPanel /> : <VersionPanel />}
    </div>
  );
}