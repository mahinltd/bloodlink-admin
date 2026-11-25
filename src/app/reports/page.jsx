'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, timeAgo } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const safeDate = (v) => (v ? formatDate(v) : '—');
const safeDateTime = (v) => (v ? formatDateTime(v) : '—');
const safeAgo = (v) => (v ? timeAgo(v) : '');

function normalizeReport(r) {
  const reporter = r?.reporter ?? r?.reportedBy ?? r?.from ?? {};
  const target = r?.reportedUser ?? r?.reported ?? r?.against ?? r?.target ?? {};
  const rawStatus = String(r?.status ?? 'pending').toLowerCase();
  return {
    id: r?._id ?? r?.id,
    reporterName: reporter?.fullName ?? reporter?.name ?? '—',
    reporterPhone: reporter?.phone ?? '',
    targetName: target?.fullName ?? target?.name ?? '—',
    targetPhone: target?.phone ?? '',
    reason: String(r?.reason ?? r?.category ?? r?.type ?? '—'),
    description: r?.description ?? r?.details ?? r?.message ?? '',
    status: rawStatus === 'under_review' ? 'reviewing' : rawStatus,
    adminNotes: r?.adminNotes ?? r?.notes ?? '',
    createdAt: r?.createdAt ?? null,
  };
}

function PersonCard({ label, name, phone, danger }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger ? 'border-red-100 bg-red-50/50' : 'border-gray-100 bg-gray-50/60'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-ink">{name}</p>
      {phone && <p className="text-xs text-gray-500">{phone}</p>}
    </div>
  );
}

function ReportDetail({ report, onClose, onSaved }) {
  const initialStatus = ['reviewing', 'resolved', 'dismissed'].includes(report.status)
    ? report.status
    : 'reviewing';
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(report.adminNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty = status !== initialStatus || notes !== report.adminNotes;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/reports/${report.id}`, {
        status,
        adminNotes: notes.trim() || undefined,
      });
      onSaved?.({ ...report, status, adminNotes: notes.trim() });
    } catch (err) {
      setError(err?.message ?? 'Failed to save.');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Report Details" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={report.status} />
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-gray-600">
            {report.reason.replaceAll('_', ' ')}
          </span>
          <span className="text-xs text-gray-400">{safeAgo(report.createdAt)}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PersonCard label="Reported User" name={report.targetName} phone={report.targetPhone} danger />
          <PersonCard label="Reported By" name={report.reporterName} phone={report.reporterPhone} />
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Description</h4>
          <p className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm leading-relaxed text-gray-700">
            {report.description || '—'}
          </p>
        </div>

        <p className="text-xs text-gray-400">Submitted: {safeDateTime(report.createdAt)}</p>

        {/* admin action */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Update Status</label>
            <select className="input w-full sm:w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
              {[
                { value: 'reviewing', label: 'Under Review' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'dismissed', label: 'Dismissed' },
              ].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Admin Notes</label>
            <textarea
              className="input min-h-[90px] w-full resize-none"
              placeholder="Internal notes about this report…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          <div className="flex justify-end">
            <button onClick={save} disabled={saving || !dirty} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function ReportsPage() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) params.set('status', status);

      const res = await api.get(`/admin/reports?${params.toString()}`);
      const d = res?.data ?? {};
      const list = d.reports ?? d.items ?? [];
      setRows(list.map(normalizeReport));
      const p = d.pagination ?? {};
      setPagination({
        page: p.page ?? page,
        totalPages: p.totalPages ?? 1,
        total: p.total ?? list.length,
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSaved = (updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setNotice('Report updated.');
    setSelected(null);
  };

  const columns = [
    {
      key: 'target',
      label: 'Reported User',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink">{r.targetName}</p>
          {r.targetPhone && <p className="text-xs text-gray-400">{r.targetPhone}</p>}
        </div>
      ),
    },
    {
      key: 'reporter',
      label: 'Reported By',
      render: (r) => <span className="text-sm text-gray-600">{r.reporterName}</span>,
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (r) => (
        <span className="text-sm capitalize text-gray-600">{r.reason.replaceAll('_', ' ')}</span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'date',
      label: 'Date',
      render: (r) => (
        <div>
          <p className="text-sm">{safeDate(r.createdAt)}</p>
          <p className="text-xs text-gray-400">{safeAgo(r.createdAt)}</p>
        </div>
      ),
    },
    { key: 'view', label: '', render: () => <span className="text-xs font-semibold text-primary">Review →</span> },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Review user reports and take action">
        <button onClick={fetchReports} className="btn-outline text-sm">
          ↻ Refresh
        </button>
      </PageHeader>

      {notice && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <select
          className="input w-full sm:w-56"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="card mb-5 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchReports} className="btn-outline mt-3 text-sm">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey="id"
        emptyIcon="🚩"
        emptyTitle="No reports found"
        emptyText="No reports match this filter. Good news, probably!"
        onRowClick={setSelected}
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />

      {selected && <ReportDetail report={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />}
    </div>
  );
}