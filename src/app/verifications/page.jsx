'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, timeAgo, getInitials } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

const safeDate = (v) => (v ? formatDate(v) : '—');
const safeDateTime = (v) => (v ? formatDateTime(v) : '—');
const safeAgo = (v) => (v ? timeAgo(v) : '');

function normalizeItem(v) {
  const donor = v?.donor ?? v?.donorProfile ?? v ?? {};
  const user = donor?.user ?? v?.user ?? {};
  return {
    id: v?._id ?? v?.id,
    name: user?.fullName ?? donor?.fullName ?? '—',
    phone: user?.phone ?? donor?.phone ?? '',
    bloodGroup: donor?.bloodGroup ?? '',
    division: donor?.division ?? '',
    district: donor?.district ?? '',
    submittedAt: v?.submittedAt ?? v?.createdAt ?? null,
  };
}

function normalizeDetail(d) {
  const v = d?.verification ?? d ?? {};
  const donor = v?.donor ?? v?.donorProfile ?? d?.donor ?? {};
  const user = donor?.user ?? v?.user ?? d?.user ?? {};
  const images = d?.images ?? d?.nidImages ?? v?.images ?? v?.nidImages ?? {};
  return {
    id: v?._id ?? v?.id ?? d?._id ?? d?.id,
    name: user?.fullName ?? donor?.fullName ?? '—',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    bloodGroup: donor?.bloodGroup ?? '',
    division: donor?.division ?? '',
    district: donor?.district ?? '',
    dob: donor?.dateOfBirth ?? donor?.dob ?? null,
    nidNumber: v?.nidNumber ?? donor?.nidNumber ?? null,
    submittedAt: v?.submittedAt ?? v?.createdAt ?? null,
    front: images?.front ?? images?.frontUrl ?? images?.nidFront ?? v?.nidFrontUrl ?? null,
    back: images?.back ?? images?.backUrl ?? images?.nidBack ?? v?.nidBackUrl ?? null,
  };
}

function maskNid(nid) {
  const s = String(nid ?? '');
  if (!s) return null;
  if (s.length <= 3) return '•••';
  return `${'•'.repeat(s.length - 3)}${s.slice(-3)}`;
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value ?? '—'}</span>
    </div>
  );
}

function ImagePanel({ label, url }) {
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      {url && !failed ? (
        <button
          type="button"
          onClick={() => window.open(url, '_blank')}
          title="Click to open full size"
          className="block w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-primary/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} onError={() => setFailed(true)} className="h-44 w-full object-contain" />
        </button>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 text-center text-xs text-gray-400">
          {failed ? '⚠️ Image failed to load — link may have expired. Reload below.' : 'No image provided'}
        </div>
      )}
    </div>
  );
}

function ReviewModal({ id, onClose, onDone }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'approve' | 'reject'
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/verification/${id}`);
      setDetail(normalizeDetail(res?.data ?? {}));
    } catch (err) {
      setError(err?.message ?? 'Failed to load verification.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async () => {
    if (!mode) return;
    if (mode === 'reject' && !reason.trim()) return;
    setActing(true);
    try {
      if (mode === 'approve') {
        await api.post(`/admin/verification/${id}/approve`);
        onDone?.(id, `${detail?.name ?? 'Donor'} verified ✓ — NID images permanently deleted.`);
      } else {
        await api.post(`/admin/verification/${id}/reject`, { reason: reason.trim() });
        onDone?.(id, 'Verification rejected — donor notified to re-submit.');
      }
    } catch (err) {
      setError(err?.message ?? 'Action failed.');
      setMode(null);
      setReason('');
      setActing(false);
    }
  };

  return (
    <>
      <Modal open onClose={onClose} title="Identity Verification" wide>
        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
            </div>
          </div>
        ) : error && !detail ? (
          <div className="py-10 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={load} className="btn-outline mt-3 text-sm">
              Retry
            </button>
          </div>
        ) : detail ? (
          <div className="space-y-5">
            {/* donor header */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {getInitials(detail.name)}
              </div>
              <div>
                <p className="font-semibold text-ink">{detail.name}</p>
                <p className="text-xs text-gray-400">
                  {detail.phone} {detail.bloodGroup && `• ${detail.bloodGroup}`}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status="pending" />
              </div>
            </div>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

            <div className="rounded-2xl border border-gray-100 bg-white">
              <InfoRow label="Email" value={detail.email || '—'} />
              <InfoRow
                label="Location"
                value={[detail.district, detail.division].filter(Boolean).join(', ') || '—'}
              />
              <InfoRow label="Date of Birth" value={safeDate(detail.dob)} />
              {detail.nidNumber && <InfoRow label="NID Number" value={maskNid(detail.nidNumber)} />}
              <InfoRow label="Submitted" value={safeDateTime(detail.submittedAt)} />
            </div>

            {/* NID images */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">NID Documents</h4>
                <button onClick={load} className="text-xs font-semibold text-primary hover:underline">
                  ↻ Reload images
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ImagePanel label="NID Front" url={detail.front} />
                <ImagePanel label="NID Back" url={detail.back} />
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                🔒 Secure signed links — expire ~10 minutes after loading. Click an image to view full size.
              </p>
            </div>

            {/* actions */}
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => setMode('reject')}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={() => setMode('approve')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                ✓ Approve & Verify
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* confirm approve / reject */}
      <Modal
        open={!!mode}
        onClose={() => {
          setMode(null);
          setReason('');
        }}
        title={mode === 'approve' ? 'Approve this donor?' : 'Reject this verification?'}
      >
        <div className="space-y-4">
          {mode === 'approve' ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-semibold">{detail?.name} will become a Verified Donor ✓</p>
              <p className="mt-1 text-emerald-700">
                Their NID images will be <strong>permanently deleted</strong> from storage immediately. This cannot be
                undone.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                The donor will be notified and asked to re-submit. A reason is required.
              </p>
              <textarea
                className="input min-h-[90px] w-full resize-none"
                placeholder="e.g. NID photo is blurry / information mismatch…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setMode(null);
                setReason('');
              }}
              className="btn-outline text-sm"
            >
              Cancel
            </button>
            <button
              onClick={act}
              disabled={acting || (mode === 'reject' && !reason.trim())}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {acting ? 'Working…' : mode === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function VerificationPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/verification/queue?page=${page}&limit=15`);
      const d = res?.data ?? {};
      const list = d.queue ?? d.items ?? d.verifications ?? [];
      setItems(list.map(normalizeItem));
      const p = d.pagination ?? {};
      setPagination({
        page: p.page ?? page,
        totalPages: p.totalPages ?? 1,
        total: p.total ?? list.length,
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to load verification queue.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleDone = (id, message) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    setNotice(message);
    setSelectedId(null);
  };

  const columns = [
    {
      key: 'donor',
      label: 'Donor',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {getInitials(r.name)}
          </div>
          <div>
            <p className="font-semibold text-ink">{r.name}</p>
            {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'bloodGroup',
      label: 'Group',
      render: (r) =>
        r.bloodGroup ? (
          <span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-primary/10 px-1.5 text-xs font-bold text-primary">
            {r.bloodGroup}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (r) => (
        <span className="text-sm text-gray-600">{[r.district, r.division].filter(Boolean).join(', ') || '—'}</span>
      ),
    },
    { key: 'status', label: 'Status', render: () => <StatusBadge status="pending" /> },
    {
      key: 'submitted',
      label: 'Submitted',
      render: (r) => (
        <div>
          <p className="text-sm">{safeDate(r.submittedAt)}</p>
          <p className="text-xs text-gray-400">{safeAgo(r.submittedAt)}</p>
        </div>
      ),
    },
    { key: 'view', label: '', render: () => <span className="text-xs font-semibold text-primary">Review →</span> },
  ];

  return (
    <div>
      <PageHeader title="Verification Queue" subtitle="Review donor NID submissions and verify identities">
        <button onClick={fetchQueue} className="btn-outline text-sm">
          ↻ Refresh
        </button>
      </PageHeader>

      {notice && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        🪪 <strong>Privacy first:</strong> NID images are served via secure signed links that expire in ~10 minutes.
        Approving a donor permanently deletes their documents from storage.
      </div>

      {error && !loading && (
        <div className="card mb-5 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchQueue} className="btn-outline mt-3 text-sm">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        rowKey="id"
        emptyIcon="🎉"
        emptyTitle="Queue is clear"
        emptyText="No pending verifications right now."
        onRowClick={(r) => setSelectedId(r.id)}
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />

      {selectedId && <ReviewModal id={selectedId} onClose={() => setSelectedId(null)} onDone={handleDone} />}
    </div>
  );
}