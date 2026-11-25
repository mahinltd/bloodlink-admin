'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Toggle from '@/components/Toggle';

function Card({ title, subtitle, children, actions }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function RawPreview({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-gray-500 hover:bg-gray-50"
      >
        <span>Raw server response</span>
        <span className="text-xs text-gray-400">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-gray-100 bg-gray-950 p-4 text-[11px] leading-relaxed text-emerald-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// Docs/02-ADMIN-API.md: app config is merged/persisted in backend AppConfig singleton.
// Supported fields: appName, logoUrl, primaryColor, secondaryColor, supportEmail,
// maintenanceMode, maintenanceMessage, featureFlags, onboarding.
const CONFIG_DEFAULTS = {
  appName: '',
  logoUrl: '',
  primaryColor: '#B71C1C',
  secondaryColor: '#111827',
  supportEmail: '',
  maintenanceMode: false,
  maintenanceMessage: '',
  featureFlags: {},
  onboarding: [],
};

function normalizeFeatureFlags(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = !!v;
  return out;
}

function normalizeConfig(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  return {
    appName: c.appName ?? '',
    logoUrl: c.logoUrl ?? '',
    primaryColor: c.primaryColor ?? '#B71C1C',
    secondaryColor: c.secondaryColor ?? '#111827',
    supportEmail: c.supportEmail ?? '',
    maintenanceMode: !!c.maintenanceMode,
    maintenanceMessage: c.maintenanceMessage ?? '',
    featureFlags: normalizeFeatureFlags(c.featureFlags),
    onboarding: Array.isArray(c.onboarding) ? c.onboarding : c.onboarding && typeof c.onboarding === 'object' ? c.onboarding : [],
  };
}

function ConfigPanel() {
  const [raw, setRaw] = useState(null);
  const [form, setForm] = useState(CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [onboardingText, setOnboardingText] = useState('[]');
  const [onboardingError, setOnboardingError] = useState('');
  const [newFlag, setNewFlag] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const load = async () => {
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
      const normalized = normalizeConfig(cfg);
      setForm(normalized);
      setOnboardingText(JSON.stringify(normalized.onboarding ?? [], null, 2));
      setOnboardingError('');
    } catch (err) {
      setError(err?.message ?? 'Failed to load config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setFlag = (key, value) => setForm((f) => ({ ...f, featureFlags: { ...f.featureFlags, [key]: value } }));
  const removeFlag = (key) =>
    setForm((f) => {
      const next = { ...f.featureFlags };
      delete next[key];
      return { ...f, featureFlags: next };
    });
  const addFlag = () => {
    const key = newFlag.trim();
    if (!key) return;
    setForm((f) => ({ ...f, featureFlags: { ...f.featureFlags, [key]: f.featureFlags[key] ?? false } }));
    setNewFlag('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setOnboardingError('');
    let onboarding;
    try {
      onboarding = onboardingText.trim() ? JSON.parse(onboardingText) : [];
    } catch {
      setSaving(false);
      setOnboardingError('Onboarding must be valid JSON (array or object).');
      return;
    }

    try {
      const payload = {
        appName: form.appName.trim(),
        logoUrl: form.logoUrl.trim(),
        primaryColor: form.primaryColor.trim(),
        secondaryColor: form.secondaryColor.trim(),
        supportEmail: form.supportEmail.trim(),
        maintenanceMode: !!form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage.trim(),
        featureFlags: normalizeFeatureFlags(form.featureFlags),
        onboarding,
      };
      const res = await api.put('/admin/config', payload);
      const cfg = res?.data?.config ?? res?.data ?? payload;
      setRaw(cfg);
      const normalized = normalizeConfig(cfg);
      setForm(normalized);
      setOnboardingText(JSON.stringify(normalized.onboarding ?? [], null, 2));
      setNotice('Configuration saved ✓');
    } catch (err) {
      setError(err?.message ?? 'Failed to save config.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-gray-400">Loading configuration…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <Card title="Branding & Support" subtitle="Fields documented by PUT /admin/config">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="App Name">
            <input className="input w-full" value={form.appName} onChange={set('appName')} placeholder="BloodLink" />
          </Field>
          <Field label="Support Email">
            <input className="input w-full" type="email" value={form.supportEmail} onChange={set('supportEmail')} placeholder="support@bloodlink.app" />
          </Field>
          <Field label="Logo URL" full>
            <input className="input w-full" value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://..." />
          </Field>
          <Field label="Primary Color" hint="Hex/CSS color used by app config.">
            <div className="flex gap-2">
              <input className="input w-full" value={form.primaryColor} onChange={set('primaryColor')} placeholder="#B71C1C" />
              <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(form.primaryColor) ? form.primaryColor : '#B71C1C'} onChange={set('primaryColor')} className="h-10 w-12 cursor-pointer rounded-xl border border-gray-200 bg-white p-1" />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex gap-2">
              <input className="input w-full" value={form.secondaryColor} onChange={set('secondaryColor')} placeholder="#111827" />
              <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(form.secondaryColor) ? form.secondaryColor : '#111827'} onChange={set('secondaryColor')} className="h-10 w-12 cursor-pointer rounded-xl border border-gray-200 bg-white p-1" />
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Maintenance" subtitle="Control maintenance mode exposed to the mobile app config">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-8">
            <label className="flex items-center gap-3">
              <Toggle checked={!!form.maintenanceMode} onChange={setBool('maintenanceMode')} />
              <div>
                <p className="text-sm font-medium text-ink">Maintenance Mode</p>
                <p className="text-[11px] text-gray-400">When enabled, app clients can show the maintenance message.</p>
              </div>
            </label>
          </div>
          <Field label="Maintenance Message" full>
            <textarea className="input w-full min-h-[90px]" value={form.maintenanceMessage} onChange={set('maintenanceMessage')} placeholder="We are performing scheduled maintenance..." />
          </Field>
        </div>
      </Card>

      <Card title="Feature Flags" subtitle="Boolean flags stored in config.featureFlags">
        <div className="space-y-3">
          {Object.keys(form.featureFlags).length === 0 && (
            <p className="text-sm text-gray-400">No feature flags configured.</p>
          )}
          {Object.entries(form.featureFlags).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
              <label className="flex items-center gap-3">
                <Toggle checked={!!value} onChange={(v) => setFlag(key, v)} />
                <span className="text-sm font-medium text-ink break-all">{key}</span>
              </label>
              <button onClick={() => removeFlag(key)} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input className="input w-full" value={newFlag} onChange={(e) => setNewFlag(e.target.value)} placeholder="newFeatureFlag" />
            <button onClick={addFlag} className="btn-outline text-sm whitespace-nowrap">Add Flag</button>
          </div>
        </div>
      </Card>

      <Card title="Onboarding" subtitle="JSON stored in config.onboarding (array/object as returned by backend)">
        <Field label="Onboarding JSON" full hint="Edit carefully; invalid JSON will block save.">
          <textarea
            className="input w-full min-h-[180px] font-mono text-xs"
            value={onboardingText}
            onChange={(e) => setOnboardingText(e.target.value)}
            spellCheck={false}
          />
        </Field>
        {onboardingError && <p className="mt-2 text-xs text-red-600">{onboardingError}</p>}
      </Card>

      <RawPreview data={raw} />

      <div className="flex justify-end gap-3">
        <button onClick={load} className="btn-outline text-sm" disabled={saving}>Reset</button>
        <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

function VersionPanel() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [currentVersion, setCurrentVersion] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [playStoreUrl, setPlayStoreUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/app-version');
      const v = res?.data?.version ?? res?.data ?? {};
      setRaw(v);
      setCurrentVersion(v.currentVersion ?? '');
      setMinimumVersion(v.minimumVersion ?? '');
      setForceUpdate(!!v.forceUpdate);
      setReleaseNotes(Array.isArray(v.releaseNotes) ? v.releaseNotes.join('\n') : v.releaseNotes ?? '');
      setPlayStoreUrl(v.playStoreUrl ?? '');
      setAppStoreUrl(v.appStoreUrl ?? '');
    } catch (err) {
      setError(err?.message ?? 'Failed to load version config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        currentVersion: currentVersion.trim(),
        forceUpdate: !!forceUpdate,
        releaseNotes: releaseNotes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        playStoreUrl: playStoreUrl.trim(),
        appStoreUrl: appStoreUrl.trim(),
      };
      const res = await api.put('/admin/app-version', payload);
      const v = res?.data?.version ?? res?.data ?? payload;
      setRaw(v);
      setNotice('App version updated ✓');
    } catch (err) {
      setError(err?.message ?? 'Failed to save version.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-gray-400">Loading version config…</p>
      </div>
    );
  }

  const semverRx = /^\d+\.\d+\.\d+$/;
  const versionOk = semverRx.test(currentVersion.trim());

  return (
    <div className="space-y-5">
      {notice && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <Card title="App Version" subtitle="Controls the force-update gate in the mobile app">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current Version" hint="Semver format: x.y.z" required>
            <input
              className={`input w-full ${currentVersion && !versionOk ? 'border-red-300 focus:border-red-400' : ''}`}
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              placeholder="1.2.3"
            />
            {currentVersion && !versionOk && <p className="mt-1 text-[11px] text-red-500">Must be x.y.z (e.g. 1.2.3)</p>}
          </Field>
          <Field label="Minimum Version (read-only)" hint="Returned by backend; not in PUT payload docs.">
            <input className="input w-full bg-gray-50" value={minimumVersion} readOnly placeholder="—" />
          </Field>
          <Field label="Play Store URL" full>
            <input className="input w-full" value={playStoreUrl} onChange={(e) => setPlayStoreUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." />
          </Field>
          <Field label="App Store URL" full>
            <input className="input w-full" value={appStoreUrl} onChange={(e) => setAppStoreUrl(e.target.value)} placeholder="https://apps.apple.com/app/..." />
          </Field>
          <Field label="Release Notes" full hint="One note per line — sent as a string array.">
            <textarea
              className="input w-full min-h-[120px]"
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder={'Bug fixes\nPerformance improvements\nNew donor map'}
            />
          </Field>
        </div>
        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <label className="flex items-center gap-3">
            <Toggle checked={forceUpdate} onChange={setForceUpdate} />
            <div>
              <p className="text-sm font-medium text-ink">Force Update</p>
              <p className="text-[11px] text-gray-400">When enabled, clients below the required version should be blocked until updated.</p>
            </div>
          </label>
        </div>
      </Card>

      <RawPreview data={raw} />

      <div className="flex justify-end gap-3">
        <button onClick={load} className="btn-outline text-sm" disabled={saving}>Reset</button>
        <button onClick={save} disabled={saving || !versionOk} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Version'}
        </button>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const [tab, setTab] = useState('config');

  return (
    <div>
      <PageHeader title="App Config" subtitle="Manage runtime configuration and app version" />

      <div className="mb-5 flex gap-1 rounded-2xl bg-gray-100 p-1 w-fit">
        { [
          { key: 'config', label: '⚙️ App Config' },
          { key: 'version', label: '📱 App Version' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        )) }
      </div>

      {tab === 'config' ? <ConfigPanel /> : <VersionPanel />}
    </div>
  );
}