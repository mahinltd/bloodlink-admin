'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { saveAuth, getToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  // ---------- Step 1: Email + Password ----------
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/admin/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });

      const data = res?.data || res || {};

      if (data.requiresTwoFactor) {
        setPendingToken(data.pendingToken || data.pending_token || '');
        setStep('2fa');
        return;
      }

      // Token যে নামেই আসুক - সব variant ধরবে
      const token =
        data.accessToken || data.token || data.access_token || data.jwt || null;
      const admin = data.admin || data.user || data.profile || null;

      if (token) {
        saveAuth(token, admin);
        router.replace('/dashboard');
      } else {
        setError('Unexpected response. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Step 2: 2FA OTP ----------
  const handle2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/admin/auth/2fa/login', {
        method: 'POST',
        body: {
          pendingToken,
          tempToken: pendingToken,
          twoFactorToken: pendingToken,
          otp,
          token: otp,
          code: otp,
        },
        auth: false,
      });

      const data = res?.data || res || {};
      const token =
        data.accessToken || data.token || data.access_token || data.jwt || null;
      const admin = data.admin || data.user || data.profile || null;

      if (token) {
        saveAuth(token, admin);
        router.replace('/dashboard');
      } else {
        setError('Unexpected response. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* -------- Left: Brand panel -------- */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-dark p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10" />

        {/* Logo — file-এর নিজের dark bg থাকায় h-11 বাদ */}
        <Image
          src="/images/logo-white.png"
          alt="BloodLink"
          width={200}
          height={48}
          className="w-auto max-w-[210px] rounded-2xl"
          priority
        />

        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Administration
            <br />
            Control Center
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Manage donors, verify identities, moderate requests and keep the
            BloodLink network safe — all from one place.
          </p>
          <div className="mt-8 space-y-3 text-sm text-white/80">
            <p>🔐 Role-based access control</p>
            <p>🛡️ Two-factor authentication</p>
            <p>📜 Every action audit-logged</p>
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          Authorized personnel only • bloodlink.tech
        </p>
      </div>

      {/* -------- Right: Form -------- */}
      <div className="flex flex-1 items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md">
          <div className="card p-8 sm:p-10">
            <div className="mb-8 text-center lg:hidden">
              <Image
                src="/images/logo.png"
                alt="BloodLink"
                width={150}
                height={42}
                className="mx-auto h-10 w-auto"
                priority
              />
            </div>

            {step === 'credentials' ? (
              <>
                <h1 className="font-display text-2xl font-extrabold text-ink">
                  Welcome Back 👋
                </h1>
                <p className="mt-1 text-sm text-ink/50">
                  Sign in to the BloodLink admin panel
                </p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@bloodlink.tech"
                      className="input"
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input pr-12"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/40 hover:text-ink"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                      ⚠️ {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                    {loading ? 'Signing in...' : 'Sign In →'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
                    🔐
                  </div>
                  <h1 className="font-display mt-4 text-2xl font-extrabold text-ink">
                    Two-Factor Authentication
                  </h1>
                  <p className="mt-2 text-sm text-ink/50">
                    Open your authenticator app and enter the 6-digit code
                  </p>
                </div>

                <form onSubmit={handle2FA} className="mt-8 space-y-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="● ● ● ● ● ●"
                    className="input text-center font-display !text-2xl font-bold tracking-[0.5em]"
                    autoFocus
                  />

                  {error && (
                    <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                      ⚠️ {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="btn-primary w-full !py-3 disabled:opacity-40"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setOtp('');
                      setError('');
                    }}
                    className="w-full text-center text-sm font-medium text-ink/50 hover:text-primary"
                  >
                    ← Back to login
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-ink/40">
            🔒 Protected area — all login attempts are recorded.
          </p>
        </div>
      </div>
    </div>
  );
}