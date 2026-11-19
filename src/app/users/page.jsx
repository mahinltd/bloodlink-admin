'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import UserDetailDrawer from '@/components/UserDetailDrawer';
import { formatDate, getInitials } from '@/lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'donor', label: 'Donor' },
  { value: 'user', label: 'User' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (status) qs.set('status', status);
      if (role) qs.set('role', role);
      qs.set('page', String(page));
      qs.set('limit', '15');

      const res = await api.get(`/admin/users?${qs.toString()}`);
      const d = res?.data ?? {};
      const list = d.users ?? d.items ?? [];
      setItems(list);
      setPagination({
        page: d.pagination?.page ?? page,
        totalPages: d.pagination?.totalPages ?? 1,
        total: d.pagination?.total ?? list.length,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, role, page]);

  // Search debounce + filter change (page reset)
  useEffect(() => {
    const t = setTimeout(() => load(), search ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, role, page]);

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {getInitials(u.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {u.fullName}
              {u.isVerified && <span className="ml-1 text-blue-500">✓</span>}
            </p>
            <p className="truncate text-xs text-ink/50">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'role', label: 'Role', render: (u) => <span className="capitalize">{u.role}</span> },
    { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.accountStatus} /> },
    { key: 'joined', label: 'Joined', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      label: '',
      render: () => <span className="text-sm font-semibold text-primary">View →</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Search, review and moderate user accounts" />

      {/* Filters */}
      <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search name, email or phone..."
          className="input sm:max-w-xs"
        />
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="input sm:w-48"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => { setPage(1); setRole(e.target.value); }}
            className="input sm:w-36"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          ⚠️ {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        emptyIcon="👥"
        emptyTitle="No users found"
        emptyText="Try a different search or filter."
        onRowClick={(u) => setSelectedId(u._id)}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPage={setPage}
      />

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}