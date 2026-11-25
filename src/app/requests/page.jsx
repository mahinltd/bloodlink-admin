'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, timeAgo } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

// Documented request statuses/filters in docs/02-ADMIN-API.md and docs/04-DATA-MODELS.md
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'searching_donors', label: 'Searching Donors' },
  { value: 'donor_responded', label: 'Donor Responded' },
  { value: 'donor_confirmed', label: 'Donor Confirmed' },
  { value: 'blood_arranged', label: 'Blood Arranged' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'All Urgency' },
  { value: 'sos', label: '🚨 SOS' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'regular', label: 'Regular' },
];

const TERMINAL_REQUEST_STATUSES = new Set(['completed', 'cancelled', 'rejected', 'expired']);

const safeDate = (v) => (v ? formatDate(v) : '—');
const safeDateTime = (v) => (v ? formatDateTime(v) : '—');
const safeAgo = (v) => (v ? timeAgo(v) : '');

function normalizeRequest(r) {
  const user = r?.requester ?? r?.requestedBy ?? r?.user ?? r?.createdBy ?? {};
  return {
    id: r?._id ?? r?.id,
    requestId: r?.requestId ?? '',
    patientName: r?.patientName ?? r?.patient ?? '—',
    bloodGroup: r?.bloodGroup ?? r?.group ?? '—',
    units: r?.numberOfBags ?? r?.unitsNeeded ?? r?.units ?? r?.bags ?? null,
    hospital: r?.hospitalName ?? r?.hospital?.name ?? '—',
    division: r?.division ?? r?.location?.division ?? '',
    district: r?.district ?? r?.location?.district ?? '',
    urgency: String(r?.urgency ?? r?.priority ?? 'regular').toLowerCase(),
    status: String(r?.status ?? 'pending').toLowerCase(),
    reason: r?.medicalProblem ?? r?.reason ?? r?.description ?? r?.additionalNotes ?? '',
    contact: r?.contactNumber ?? r?.phone ?? user?.phone ?? '',
    requiredBy: r?.requiredDate && r?.requiredTime ? `${r.requiredDate} ${r.requiredTime}` : r?.requiredBy ?? r?.neededBy ?? null,
    expiresAt: r?.expiresAt ?? null,
    createdAt: r?.createdAt ?? null,
    requesterName: user?.fullName ?? user?.name ?? '—',
    requesterPhone: user?.phone ?? '',
    responses: r?.interestedCount ?? r?.responseCount ?? r?.responses?.length ?? null,
  };
}

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function UrgencyBadge({ urgency }) {
  if (urgency === 'sos') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
        🚨 SOS
      </span>
    );
  }
  if (urgency === 'urgent') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
        Urgent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
      Regular
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</h4>
      <div className="rounded-2xl border border-gray-100 bg-white">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value ?? '—'}</span>
    </div>
  );
}

function RequestDetail({ id, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // 'close' | 'reject'
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/requests/${id}`);
      const d = res?.data ?? {};
      setDetail(normalizeRequest(d.request ?? d));
    } catch (err) {
      setError(err?.message ?? 'Failed to load request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async () => {
    if (!confirmAction) return;
    if (confirmAction === 'reject' && !reason.trim()) return;
    setActing(true);
    try {
      await api.patch(`/admin/requests/${id}/moderate`, {
        action: confirmAction,
        reason: reason.trim() || undefined,
      });
      onChanged?.(confirmAction === 'reject' ? 'Request rejected & requester notified.' : 'Request closed.');
    } catch (err) {
      setError(err?.message ?? 'Action failed.');
      setConfirmAction(null);
      setReason('');
      setActing(false);
    }
  };

  const canModerate = detail && !TERMINAL_REQUEST_STATUSES.has(detail.status);
  const left = detail ? timeLeft(detail.expiresAt) : null;

  return (
    <>
      <Modal open onClose={onClose} title="Blood Request" wide>
        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
            ))}
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
            {/* header strip */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 min-w-[3rem] items-center justify-center rounded-xl bg-primary/10 px-2 text-sm font-bold text-primary">
                {detail.bloodGroup}
              </span>
              <UrgencyBadge urgency={detail.urgency} />
              <StatusBadge status={detail.status} />
              {left && canModerate && <span className="text-xs text-gray-400">⏱ {left}</span>}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <Section title="Patient & Need">
              <InfoRow label="Patient" value={detail.patientName} />
              <InfoRow label="Units needed" value={detail.units} />
              <InfoRow label="Required by" value={safeDateTime(detail.requiredBy)} />
              <InfoRow label="Expires" value={safeDateTime(detail.expiresAt)} />
            </Section>

            <Section title="Location & Contact">
              <InfoRow label="Hospital" value={detail.hospital} />
              <InfoRow label="District" value={detail.district || '—'} />
              <InfoRow label="Division" value={detail.division || '—'} />
              <InfoRow label="Contact" value={detail.contact || '—'} />
            </Section>

            {detail.reason && (
              <Section title="Reason / Notes">
                <p className="px-4 py-3 text-sm leading-relaxed text-gray-600">{detail.reason}</p>
              </Section>
            )}

            <Section title="Requester">
              <InfoRow label="Name" value={detail.requesterName} />
              <InfoRow label="Phone" value={detail.requesterPhone || '—'} />
              <InfoRow label="Created" value={safeDateTime(detail.createdAt)} />
              {detail.responses != null && <InfoRow label="Donor responses" value={detail.responses} />}
            </Section>

            {canModerate && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <button onClick={() => setConfirmAction('close')} className="btn-outline text-sm">
                  Close Request
                </button>
                <button
                  onClick={() => setConfirmAction('reject')}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Reject Request
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* confirm modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => {
          setConfirmAction(null);
          setReason('');
        }}
        title={confirmAction === 'reject' ? 'Reject this request?' : 'Close this request?'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmAction === 'reject'
              ? 'The requester will be notified that their request was rejected. A reason is required — it will be audit-logged.'
              : 'The request will be marked as closed and donors will stop being notified.'}
          </p>
          <textarea
            className="input min-h-[90px] w-full resize-none"
            placeholder={confirmAction === 'reject' ? 'Reason (required)…' : 'Reason (optional)…'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmAction(null);
                setReason('');
              }}
              className="btn-outline text-sm"
            >
              Cancel
            </button>
            <button
              onClick={act}
              disabled={acting || (confirmAction === 'reject' && !reason.trim())}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {acting ? 'Working…' : confirmAction === 'reject' ? 'Reject' : 'Close'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function RequestsPage() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Docs: status, urgency, search, page, limit
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (urgency) params.set('urgency', urgency);

      const res = await api.get(`/admin/requests?${params.toString()}`);
      const d = res?.data ?? {};
      const list = d.requests ?? d.items ?? [];
      setRows(list.map(normalizeRequest));
      const p = d.pagination ?? {};
      setPagination({
        page: p.page ?? page,
        totalPages: p.totalPages ?? 1,
        total: p.total ?? list.length,
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, urgency]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const columns = [
    {
      key: 'patient',
      label: 'Patient',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink">{r.patientName}</p>
          <p className="text-xs text-gray-400">{r.hospital}</p>
        </div>
      ),
    },
    {
      key: 'bloodGroup',
      label: 'Group',
      render: (r) => (
        <span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-primary/10 px-1.5 text-xs font-bold text-primary">
          {r.bloodGroup}
        </span>
      ),
    },
    { key: 'urgency', label: 'Urgency', render: (r) => <UrgencyBadge urgency={r.urgency} /> },
    {
      key: 'location',
      label: 'Location',
      render: (r) => (
        <span className="text-sm text-gray-600">
          {[r.district, r.division].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    { key: 'units', label: 'Units', render: (r) => <span className="text-sm font-medium">{r.units ?? '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'created',
      label: 'Created',
      render: (r) => (
        <div>
          <p className="text-sm">{safeDate(r.createdAt)}</p>
          <p className="text-xs text-gray-400">{safeAgo(r.createdAt)}</p>
        </div>
      ),
    },
    { key: 'view', label: '', render: () => <span className="text-xs font-semibold text-primary">View →</span> },
  ];

  return (
    <div>
      <PageHeader title="Blood Requests" subtitle="Monitor, moderate and close blood requests">
        <button onClick={fetchRequests} className="btn-outline text-sm">
          ↻ Refresh
        </button>
      </PageHeader>

      {notice && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      {/* filters */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <input
          className="input w-full sm:w-64"
          placeholder="Search patient / hospital…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select className="input" value={status} onChange={onFilter(setStatus)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className="input" value={urgency} onChange={onFilter(setUrgency)}>
          {URGENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="card mb-5 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchRequests} className="btn-outline mt-3 text-sm">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey="id"
        emptyIcon="🩸"
        emptyTitle="No requests found"
        emptyText="Try adjusting the filters."
        onRowClick={(r) => setSelectedId(r.id)}
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />

      {selectedId && (
        <RequestDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={(msg) => {
            setNotice(msg);
            setSelectedId(null);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}