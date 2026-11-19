'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const AUDIENCES = [
  { value: 'all', icon: '👥', label: 'All Users', desc: 'Every registered BloodLink user' },
  { value: 'donors', icon: '🩸', label: 'Donors Only', desc: 'Users who have donor profiles' },
  { value: 'users', icon: '👤', label: 'General Users', desc: 'Users without donor profiles' },
];

const TITLE_MAX = 65;
const BODY_MAX = 240;

export default function BroadcastPage() {
  const [audience, setAudience] = useState('donors');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const valid = title.trim().length > 0 && body.trim().length > 0;
  const audienceMeta = AUDIENCES.find((a) => a.value === audience);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await api.post('/admin/broadcast', {
        title: title.trim(),
        body: body.trim(),
        audience,
      });
      const d = res?.data ?? {};
      const count = d.sent ?? d.recipients ?? d.recipientCount ?? d.delivered;
      setNotice(
        typeof count === 'number'
          ? `Broadcast sent to ~${count.toLocaleString()} devices 🚀`
          : 'Broadcast sent 🚀'
      );
      setTitle('');
      setBody('');
      setConfirming(false);
    } catch (err) {
      setError(err?.message ?? 'Failed to send broadcast.');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader title="Broadcast" subtitle="Send a push notification to app users" />

      {notice && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* composer */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-bold text-ink">🎯 Audience</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    audience === a.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <p className="mt-1.5 text-sm font-bold text-ink">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500">Title</label>
                <span className="text-[11px] text-gray-400">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                className="input w-full"
                maxLength={TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🩸 রক্তদান সচেতনতা সপ্তাহ শুরু!"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500">Message</label>
                <span className="text-[11px] text-gray-400">
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <textarea
                className="input min-h-[120px] w-full resize-none"
                maxLength={BODY_MAX}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message… (Bengali or English)"
              />
            </div>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <button onClick={() => setConfirming(true)} disabled={!valid} className="btn-primary text-sm disabled:opacity-50">
                Send Broadcast →
              </button>
            </div>
          </div>
        </div>

        {/* live preview */}
        <div className="card h-fit p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">📱 Live Preview</h3>
          <div className="rounded-[2rem] border border-gray-200 bg-ink p-3 shadow-lg">
            <div className="min-h-[220px] rounded-3xl bg-gray-100 p-3">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] text-white">
                    🩸
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">BloodLink</span>
                  <span className="ml-auto text-[10px] text-gray-400">now</span>
                </div>
                <p className="mt-1.5 break-words text-[13px] font-semibold text-ink">
                  {title.trim() || 'Notification title'}
                </p>
                <p className="break-words text-[12px] leading-snug text-gray-500">
                  {body.trim() || 'Your message will appear here…'}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            {audienceMeta.icon} Going to: <strong>{audienceMeta.label}</strong>
          </p>
        </div>
      </div>

      {/* confirm modal */}
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Send this broadcast?">
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ This will send a <strong>real push notification</strong> to users' devices. Double-check spelling and
            audience!
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
            <p className="text-xs text-gray-400">
              To: {audienceMeta.icon} {audienceMeta.label}
            </p>
            <p className="mt-2 text-sm font-bold text-ink">{title.trim()}</p>
            <p className="mt-0.5 text-sm text-gray-600">{body.trim()}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="btn-outline text-sm">
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {sending ? 'Sending…' : '🚀 Send Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}