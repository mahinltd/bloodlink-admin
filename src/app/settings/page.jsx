'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { getAdmin, saveAdmin } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  const [admin, setAdmin] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [setupData, setSetupData] = useState(null); // { qr, otpauthUrl, secret }
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [backendMissing, setBackendMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/auth/me');
      const a = res?.data?.admin ?? res?.data ?? getAdmin();
      setAdmin(a);
      setEnabled(!!a?.twoFactorEnabled);
    } catch {
      const a = getAdmin();
      setAdmin(a);
      setEnabled(!!a?.twoFactorEnabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const startSetup = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/admin/auth/2fa/setup');
      const d = res?.data ?? {};

      const secret = d.secret ?? d.manualKey ?? d.manualEntryKey ?? d.base32 ?? null;
      const otpauthUrl =
        d.otpauthUrl ??
        d.otpauth_url ??
        d.otpAuthUrl ??
        d.uri ??
        d.totpUri ??
        d.url ??
        (secret
          ? `otpauth://totp/${encodeURIComponent('BloodLink Admin')}:${encodeURIComponent(
              admin?.email ?? 'admin'
            )}?secret=${secret}&issuer=${encodeURIComponent('BloodLink Admin')}`
          : null);

      setSetupData({
        qr: d.qrCode ?? d.qrCodeDataUrl ?? d.qr ?? null,
        otpauthUrl,
        secret,
      });
      setOtp('');
    } catch (err) {
      if (/not found|route/i.test(err?.message ?? '')) setBackendMissing(true);
      else setError(err?.message ?? '2FA setup failed.');
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    if (otp.length !== 6) return;
    setError('');
    setBusy(true);
    try {
      await api.post('/admin/auth/2fa/enable', { code: otp });
      setEnabled(true);
      setSetupData(null);
      setOtp('');
      setNotice('Two-Factor Authentication enabled ✓ — you will need a code on your next login.');
      if (admin) saveAdmin({ ...admin, twoFactorEnabled: true });
    } catch (err) {
      setError(err?.message ?? 'Invalid code — please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Security" subtitle="Account security settings" />
        <div className="h-48 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Security" subtitle="Protect your admin account" />

      {notice && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      <div className="card max-w-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-ink">🔐 Two-Factor Authentication (2FA)</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add an authenticator-app code requirement to your admin login.
            </p>
          </div>
          {enabled ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              ON ✓
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
              OFF
            </span>
          )}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          {!enabled && !setupData && !backendMissing && (
            <button onClick={startSetup} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
              {busy ? 'Loading…' : 'Enable 2FA →'}
            </button>
          )}

          {backendMissing && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ The 2FA setup endpoint was not found on the backend. Please confirm the backend deployment includes the
              documented admin 2FA routes.
            </div>
          )}

          {setupData && (
            <div className="space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
                <li>
                  Install <strong>Google Authenticator</strong> (or Authy) on your phone.
                </li>
                <li>Scan the QR code below.</li>
                <li>Enter the 6-digit code from the app to verify and enable 2FA.</li>
              </ol>

              <div className="flex justify-center rounded-2xl border border-gray-100 bg-white p-5">
                {setupData.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={setupData.qr} alt="2FA QR Code" className="h-48 w-48" />
                ) : setupData.otpauthUrl ? (
                  <QRCodeSVG value={setupData.otpauthUrl} size={192} />
                ) : (
                  <p className="py-10 text-center text-sm text-gray-400">
                    Could not generate a QR code — use the manual key below.
                  </p>
                )}
              </div>

              {setupData.secret && (
                <details className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-500">
                    Can&apos;t scan the QR code? Show manual entry key
                  </summary>
                  <p className="mt-2 select-all break-all text-center font-mono text-sm font-bold tracking-widest text-ink">
                    {setupData.secret}
                  </p>
                </details>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="input w-40 text-center font-mono text-lg tracking-[0.4em]"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button
                  onClick={enable}
                  disabled={otp.length !== 6 || busy}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Verify & Enable'}
                </button>
                <button
                  onClick={() => {
                    setSetupData(null);
                    setOtp('');
                    setError('');
                  }}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {enabled && (
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
              2FA is enabled for this admin account. If you need to disable it, follow your backend/admin recovery
              procedure. This panel only exposes the documented 2FA setup and enable endpoints.
            </div>
          )}

          {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
}