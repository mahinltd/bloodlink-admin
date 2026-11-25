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
      setNotice('Two-Factor Authentication enabled ✓ — পরের login থেকে code লাগবে।');
      if (admin) saveAdmin({ ...admin, twoFactorEnabled: true });
    } catch (err) {
      setError(err?.message ?? 'Invalid code — আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (otp.length !== 6) return;
    setError('');
    setBusy(true);
    try {
      await api.post('/admin/auth/2fa/disable', { otp, token: otp, code: otp });
      setEnabled(false);
      setOtp('');
      setNotice('2FA disabled.');
      if (admin) saveAdmin({ ...admin, twoFactorEnabled: false });
    } catch (err) {
      setError(err?.message ?? 'Invalid code.');
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
              Login-এ password-এর সাথে Google Authenticator-এর ৬-সংখ্যার code লাগবে।
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
          {/* ── OFF → enable flow ── */}
          {!enabled && !setupData && !backendMissing && (
            <button onClick={startSetup} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
              {busy ? 'Loading…' : 'Enable 2FA →'}
            </button>
          )}

          {backendMissing && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ Backend-এ 2FA setup endpoint পাওয়া যায়নি। এটা আমাকে জানান — backend-এ endpoint যোগ করে দেব।
            </div>
          )}

          {setupData && (
            <div className="space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
                <li>
                  ফোনে <strong>Google Authenticator</strong> (বা Authy) install করুন
                </li>
                <li>নিচের QR code-টা scan করুন</li>
                <li>App-এ যে ৬-সংখ্যার code আসবে, সেটা নিচে লিখে Verify চাপুন</li>
              </ol>

              {/* QR code — client-side generated */}
              <div className="flex justify-center rounded-2xl border border-gray-100 bg-white p-5">
                {setupData.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={setupData.qr} alt="2FA QR Code" className="h-48 w-48" />
                ) : setupData.otpauthUrl ? (
                  <QRCodeSVG value={setupData.otpauthUrl} size={192} />
                ) : (
                  <p className="py-10 text-center text-sm text-gray-400">
                    QR তৈরি করা যায়নি — নিচের manual key ব্যবহার করুন
                  </p>
                )}
              </div>

              {/* manual key — collapsed, আর বড় হয়ে দেখাবে না */}
              {setupData.secret && (
                <details className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-500">
                    QR scan করা যাচ্ছে না? Manual entry key দেখুন
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
                  }}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── ON → disable flow ── */}
          {enabled && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">2FA বন্ধ করতে Authenticator app-এর current code-টা দিন:</p>
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
                  onClick={disable}
                  disabled={otp.length !== 6 || busy}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
}