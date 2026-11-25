'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'admin_login', label: 'Admin Login' },
  { value: 'user_status_change', label: 'User Status Change' },
  { value: 'donor_availability_change', label: 'Donor Availability Change' },
  { value: 'request_moderate', label: 'Request Moderation' },
  { value: 'report_update', label: 'Report Update' },
  { value: 'verification_approve', label: 'Verification Approve' },
  { value: 'verification_reject', label: 'Verification Reject' },
  { value: 'hospital_create', label: 'Hospital Create' },
  { value: 'hospital_update', label: 'Hospital Update' },
  { value: 'hospital_delete', label: 'Hospital Delete' },
  { value: 'blood_bank_create', label: 'Blood Bank Create' },
  { value: 'blood_bank_update', label: 'Blood Bank Update' },
  { value: 'blood_bank_delete', label: 'Blood Bank Delete' },
  { value: 'config_update', label: 'Config Update' },
  { value: 'app_version_update', label: 'App Version Update' },
  { value: 'broadcast_send', label: 'Broadcast Send' },
];

const safeDateTime = (v) => (v ? formatDateTime(v) : '—');
const safeAgo = (v) => (v ? timeAgo(v) : '');

function normalizeLog(x) {
  const admin = x?.admin ?? x?.performedBy ?? x?.actor ?? {};
  const target = x?.target ?? {};
  return {
    id: x?._id ?? x?.id,
    adminName: admin?.fullName ?? admin?.name ?? x?.adminName ?? '—',
    adminEmail: admin?.email ?? x?.adminEmail ?? '',
    adminRole: admin?.role ?? '',
    action: String(x?.action ?? x?.event ?? 'unknown'),
    targetType: x?.targetType ?? target?.type ?? '',
    targetId: x?.targetId ?? target?.id ?? '',
    reason: x?.reason ?? '',
    ip: x?.ip ?? x?.ipAddress ?? '',
    userAgent: x?.userAgent ?? '',
    metadata: x?.metadata ?? x?.details ?? x?.changes ?? null,
    createdAt: x?.createdAt ?? null,
    raw: x,
  };
}

function actionStyle(action) {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('auth') || a.includes('2fa'))
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (a.includes('ban') || a.includes('delete') || a.includes('reject'))
    return 'bg-red-50 text-red-700 ring-red-200';
  if (a.includes('suspend') || a.includes('moderate') || a.includes('report'))
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (a.includes('verify') || a.includes('approve') || a.includes('restore'))
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (a.includes('broadcast')) return 'bg-primary/10 text-primary ring-primary/20';
  if (a.includes('hospital') || a.includes('blood_bank') || a.includes('bloodbank'))
    return 'bg-purple-50 text-purple-700 ring-purple-200';
  if (a.includes('config') || a.includes('version')) return 'bg-gray-100 text-gray-600 ring-gray-200';
  return 'bg-gray-100 text-gray-600 ring-gray-200';
}

function ActionBadge({ action }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${actionStyle(
        action
      )}`}
    >
      {action.replaceAll('_', ' ')}
    </span>
  );
}

function csvCell(v) {
  const s = String(v ?? '');
  return `"${s.replaceAll('"', '""')}"`;
}

function LogDetail({ log, onClose }) {
  return (
    <Modal open onClose={onClose} title="Audit Log Detail" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ActionBadge action={log.action} />
          <span className="text-xs text-gray-400">{safeDateTime(log.createdAt)}</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5">
            <span className="text-xs text-gray-400">Admin</span>
            <span className="text-right text-sm font-medium text-ink">
              {log.adminName}
              {log.adminRole && <span className="ml-1 text-xs capitalize text-gray-400">({log.adminRole.replaceAll('_', ' ')})</span>}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5">
            <span className="text-xs text-gray-400">Email</span>
            <span className="text-sm font-medium text-ink">{log.adminEmail || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5">
            <span className="text-xs text-gray-400">Target</span>
            <span className="text-right text-sm font-medium text-ink">
              {log.targetType || log.targetId
                ? `${log.targetType || 'record'} ${log.targetId ? `(${log.targetId})` : ''}`
                : '—'}
            </span>
          </div>
          {log.reason && (
            <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5">
              <span className="text-xs text-gray-400">Reason</span>
              <span className="text-right text-sm font-medium text-ink">{log.reason}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-4 py-2.5">
            <span className="text-xs text-gray-400">IP Address</span>
            <span className="font-mono text-sm font-medium text-ink">{log.ip || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-xs text-gray-400">Time</span>
            <span className="text-sm font-medium text-ink">
              {safeDateTime(log.createdAt)} ({safeAgo(log.createdAt)})
            </span>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Raw Data</h4>
          <pre className="max-h-64 overflow-auto rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-[11px] leading-relaxed text-gray-600">
            {JSON.stringify(log.raw, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

export default function AuditLogsPage() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [action, setAction] = useState('');
  const [adminId, setAdminId] = useState('');
  const [debouncedAdminId, setDebouncedAdminId] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAdminId(adminId.trim()), 400);
    return () => clearTimeout(t);
  }, [adminId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Docs: action prefix, adminId, page, limit
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (action) params.set('action', action);
      if (debouncedAdminId) params.set('adminId', debouncedAdminId);

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      const d = res?.data ?? {};
      const list = d.logs ?? d.items ?? d.auditLogs ?? [];
      setRows(list.map(normalizeLog));
      const p = d.pagination ?? {};
      setPagination({
        page: p.page ?? page,
        totalPages: p.totalPages ?? 1,
        total: p.total ?? list.length,
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, action, debouncedAdminId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportCsv = () => {
    const header = ['Time', 'Admin', 'Email', 'Action', 'Target Type', 'Target ID', 'IP'];
    const lines = rows.map((r) =>
      [
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.adminName,
        r.adminEmail,
        r.action,
        r.targetType,
        r.targetId,
        r.ip,
      ]
        .map(csvCell)
        .join(',')
    );
    const csv = [header.map(csvCell).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-page-${pagination.page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setAction('');
    setAdminId('');
    setPage(1);
  };

  const columns = [
    {
      key: 'time',
      label: 'Time',
      render: (r) => (
        <div>
          <p className="text-sm">{safeDateTime(r.createdAt)}</p>
          <p className="text-xs text-gray-400">{safeAgo(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'admin',
      label: 'Admin',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink">{r.adminName}</p>
          <p className="text-xs text-gray-400">{r.adminEmail}</p>
        </div>
      ),
    },
    { key: 'action', label: 'Action', render: (r) => <ActionBadge action={r.action} /> },
    {
      key: 'target',
      label: 'Target',
      render: (r) =>
        r.targetType || r.targetId ? (
          <div>
            <p className="text-sm capitalize text-gray-600">{r.targetType || 'record'}</p>
            {r.targetId && <p className="font-mono text-xs text-gray-400">…{String(r.targetId).slice(-8)}</p>}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'ip',
      label: 'IP',
      render: (r) => <span className="font-mono text-xs text-gray-500">{r.ip || '—'}</span>,
    },
    { key: 'view', label: '', render: () => <span className="text-xs font-semibold text-primary">Detail →</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every admin action, recorded — full accountability trail">
        <button onClick={exportCsv} disabled={rows.length === 0} className="btn-outline text-sm disabled:opacity-50">
          ⬇ Export CSV
        </button>
        <button onClick={fetchLogs} className="btn-outline text-sm">
          ↻ Refresh
        </button>
      </PageHeader>

      {/* filters */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <select
          className="input"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className="input w-full sm:w-56"
          placeholder="Search admin ID…"
          value={adminId}
          onChange={(e) => {
            setAdminId(e.target.value);
            setPage(1);
          }}
        />
        {(action || adminId) && (
          <button onClick={clearFilters} className="text-xs font-semibold text-primary hover:underline">
            ✕ Clear filters
          </button>
        )}
      </div>

      {error && !loading && (
        <div className="card mb-5 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchLogs} className="btn-outline mt-3 text-sm">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey="id"
        emptyIcon="📜"
        emptyTitle="No logs found"
        emptyText="Admin actions will appear here as they happen."
        onRowClick={setSelected}
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />

      {selected && <LogDetail log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}