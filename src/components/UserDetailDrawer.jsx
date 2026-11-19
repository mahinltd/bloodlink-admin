'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import { formatDate, formatDateTime, getInitials } from '@/lib/format';

const ACTIONS = [
  { key: 'suspend', label: 'Suspend', icon: '⏸️', desc: 'Temporarily block this user. All sessions revoked.' },
  { key: 'ban', label: 'Ban', icon: '⛔', desc: 'Permanently ban this user. All sessions revoked.' },
  { key: 'restore', label: 'Restore', icon: '♻️', desc: 'Restore this account back to active.' },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/5 py-2.5 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value || '—'}</span>
    </div>
  );
}

export default function UserDetailDrawer({ userId, onClose, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setDetail(res?.data ?? {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setNotice('');
    load();
  }, [load]);

  const runAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.key === 'ban' && !reason.trim()) return;
    setActing(true);
    try {
      await api.patch(`/admin/users/${userId}/status`, {
        action: pendingAction.key,
        reason: reason.trim() || undefined,
      });
      setNotice(`✅ User ${pendingAction.key}ed successfully — audit-logged.`);
      setPendingAction(null);
      setReason('');
      await load();
      onChanged?.();
    } catch (e) {
      setNotice(`⚠️ ${e.message}`);
    } finally {
      setActing(false);
    }
  };

  const user = detail?.user ?? detail ?? {};
  const donor = detail?.donorProfile ?? detail?.donor ?? null;
  const counts = detail?.counts ?? {};
  const status = user.accountStatus;

  const availableActions = ACTIONS.filter((a) => {
    if (a.key === 'restore') return status === 'suspended' || status === 'banned';
    if (a.key === 'suspend') return status === 'active' || status === 'pending_verification';
    if (a.key === 'ban') return !!status && status !== 'banned';
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-ink/5 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-ink">User Details</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/40 hover:bg-ink/5"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-ink/5" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              ⚠️ {error}
            </div>
          ) : (
            <>
              {notice && (
                <div className="mb-5 rounded-xl bg-cream px-4 py-3 text-sm font-medium text-ink">
                  {notice}
                </div>
              )}

              {/* Identity */}
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {getInitials(user.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-ink">
                    {user.fullName}
                    {user.isVerified && <span className="ml-1.5 text-blue-500">✓</span>}
                  </p>
                  <p className="truncate text-sm text-ink/50">{user.email}</p>
                  <div className="mt-1.5"><StatusBadge status={status} /></div>
                </div>
              </div>

              {/* Account */}
              <h4 className="font-display mt-7 mb-2 text-sm font-bold text-ink">👤 Account</h4>
              <div className="card !rounded-xl px-4 py-1">
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label="Role" value={<span className="capitalize">{user.role}</span>} />
                <InfoRow label="Email Verified" value={user.isEmailVerified ? '✅ Yes' : '❌ No'} />
                <InfoRow label="Joined" value={formatDate(user.createdAt)} />
                <InfoRow label="Last Updated" value={formatDateTime(user.updatedAt)} />
              </div>

              {/* Donor profile */}
              {donor && (
                <>
                  <h4 className="font-display mt-7 mb-2 text-sm font-bold text-ink">🩸 Donor Profile</h4>
                  <div className="card !rounded-xl px-4 py-1">
                    <InfoRow
                      label="Blood Group"
                      value={
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                          {donor.bloodGroup}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Location"
                      value={[donor.address?.district, donor.address?.division].filter(Boolean).join(', ')}
                    />
                    <InfoRow label="Availability" value={<StatusBadge status={donor.availabilityStatus} />} />
                    <InfoRow label="Total Donations" value={donor.totalDonationCount ?? 0} />
                    <InfoRow label="Last Donation" value={formatDate(donor.lastDonationDate)} />
                    <InfoRow label="Next Eligible" value={formatDate(donor.nextEligibleDate)} />
                  </div>
                </>
              )}

              {/* Activity counts */}
              {(counts.requests != null || counts.donations != null || counts.reports != null) && (
                <>
                  <h4 className="font-display mt-7 mb-2 text-sm font-bold text-ink">📊 Activity</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[['Requests', counts.requests], ['Donations', counts.donations], ['Reports', counts.reports]].map(
                      ([label, val]) => (
                        <div key={label} className="card !rounded-xl p-3 text-center">
                          <p className="font-display text-xl font-extrabold text-ink">{val ?? 0}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}

              <p className="mt-6 rounded-xl bg-cream px-4 py-3 text-xs text-ink/50">
                📜 Every moderation action is recorded in Audit Logs with your identity.
              </p>
            </>
          )}
        </div>

        {/* Actions footer */}
        {!loading && !error && availableActions.length > 0 && (
          <div className="shrink-0 border-t border-ink/5 p-4">
            <div className="grid grid-cols-3 gap-2">
              {availableActions.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setPendingAction(a)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    a.key === 'ban'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : a.key === 'restore'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Confirm modal */}
      <Modal
        open={!!pendingAction}
        onClose={() => { setPendingAction(null); setReason(''); }}
        title={pendingAction ? `${pendingAction.icon} ${pendingAction.label} User` : ''}
      >
        <p className="text-sm text-ink/60">{pendingAction?.desc}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={
            pendingAction?.key === 'ban' ? 'Reason (required for ban)...' : 'Reason (optional)...'
          }
          className="input mt-4 resize-none"
        />
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => { setPendingAction(null); setReason(''); }}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            onClick={runAction}
            disabled={acting || (pendingAction?.key === 'ban' && !reason.trim())}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            {acting ? 'Processing...' : `Confirm ${pendingAction?.label}`}
          </button>
        </div>
      </Modal>
    </>
  );
}