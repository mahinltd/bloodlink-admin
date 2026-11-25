```
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { ROLE_LABELS } from '@/constants/admin';

const CREATE_ROLE_OPTIONS = [
  { value: 'verification_admin', label: 'Verification Admin' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'content_admin', label: 'Content Admin' },
  { value: 'monitoring_admin', label: 'Monitoring Admin' },
];

function normalizeAdmin(a) {
  return {
    id: a?._id ?? a?.id,
    fullName: a?.fullName ?? a?.name ?? '—',
    email: a?.email ?? '—',
    role: a?.role ?? '',
    isActive: a?.isActive !== false,
    twoFactorEnabled: !!a?.twoFactorEnabled,
    lastLoginAt: a?.lastLoginAt ?? null,
    createdAt: a?.createdAt ?? null,
  };
}

export default function AdminsPage() {
  const currentAdmin = getAdmin();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'support_admin' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deactivating, setDeactivating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/admins');
      const d = res?.data ?? {};
      const list = d.admins ?? d.items ?? (Array.isArray(d) ? d : []);
      setRows((Array.isArray(list) ? list : []).map(normalizeAdmin));
    } catch (err) {
      setError(err?.message ?? 'Failed to load admins.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAdmin = async () => {
    setFormError('');
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const role = form.role;
    if (fullName.length < 3) return setFormError('Full name must be at least 3 characters.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setFormError('A valid email is required.');
    if (password.length < 10 || password.length > 64) return setFormError('Password must be 10-64 characters.');
    if (!CREATE_ROLE_OPTIONS.some((r) => r.value === role)) return setFormError('Select a valid role.');

    setSaving(true);
    try {
      await api.post('/admin/admins', { fullName, email, password, role });
      setNotice('Admin account created.');
      setCreateOpen(false);
      setForm({ fullName: '', email: '', password: '', role: 'support_admin' });
      await load();
    } catch (err) {
      setFormError(err?.message ?? 'Failed to create admin.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!deactivating) return;
    setBusyId(deactivating.id);
    try {
      await api.patch(`/admin/admins/${deactivating.id}/deactivate`);
      setNotice(`${deactivating.fullName} deactivated.`);
      setDeactivating(null);
      await load();
    } catch (err) {
      setError(err?.message ?? 'Failed to deactivate admin.');
      setDeactivating(null);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Admin',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink">
            {r.fullName}
            {currentAdmin?.email && currentAdmin.email === r.email && (
              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">You</span>
            )}
          </p>
          <p className="text-xs text-gray-400">{r.email}</p>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (r) => <span className="text-sm">{ROLE_LABELS[r.role] ?? r.role}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${r.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
          {r.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: '2fa',
      label: '2FA',
      render: (r) => <span className="text-sm text-gray-600">{r.twoFactorEnabled ? 'Enabled' : 'Off'}</span>,
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (r) => <span className="text-sm text-gray-600">{r.lastLoginAt ? formatDateTime(r.lastLoginAt) : '—'}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => {
        const isSelf = currentAdmin?.email && currentAdmin.email === r.email;
        if (!r.isActive || isSelf) return <span className="text-xs text-gray-400">{isSelf ? 'Current account' : '—'}</span>;
        return (
          <button
            onClick={() => setDeactivating(r)}
            disabled={busyId === r.id}
            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            {busyId === r.id ? '…' : 'Deactivate'}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Admins" subtitle="Manage admin accounts (super admin only)">
        <button onClick={load} className="btn-outline text-sm">↻ Refresh</button>
        <button onClick={() => { setFormError(''); setCreateOpen(true); }} className="btn-primary text-sm">+ Create Admin</button>
      </PageHeader>

      {notice && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
      {error && !loading && (
        <div className="card mb-5 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={load} className="btn-outline mt-3 text-sm">Retry</button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey="id"
        emptyIcon="🛡️"
        emptyTitle="No admins found"
        emptyText="Create an admin account to delegate responsibilities."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Admin" wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500">Full Name</label>
              <input className="input w-full" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Admin full name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Email</label>
              <input className="input w-full" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@bloodlink.tech" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Role</label>
              <select className="input w-full" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {CREATE_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500">Temporary Password (10-64 chars)</label>
              <input className="input w-full" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Strong password" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Super admin cannot be created through this endpoint, per backend docs.</p>
          {formError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button onClick={() => setCreateOpen(false)} className="btn-outline text-sm">Cancel</button>
            <button onClick={createAdmin} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Creating…' : 'Create Admin'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deactivating} onClose={() => setDeactivating(null)} title="Deactivate admin?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{deactivating?.fullName}</strong> ({deactivating?.email}) will be deactivated. This action is
            audit-logged. Self-deactivation is rejected by the backend.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeactivating(null)} className="btn-outline text-sm">Cancel</button>
            <button onClick={deactivate} disabled={!!busyId} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {busyId ? 'Working…' : 'Deactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```