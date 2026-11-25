'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAdmin } from '@/lib/auth';
import { formatDate, timeAgo } from '@/lib/format';
import { DIVISIONS, BLOOD_GROUPS } from '@/constants/options';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import Toggle from '@/components/Toggle';

const opt = (o) =>
  typeof o === 'string' ? { value: o, label: o } : { value: o.value ?? '', label: o.label ?? o.name ?? '' };

const safeDate = (v) => (v ? formatDate(v) : '—');
const safeAgo = (v) => (v ? timeAgo(v) : '');

function normalizeItem(x) {
  return {
    id: x?._id ?? x?.id,
    name: x?.name ?? '—',
    division: x?.division ?? x?.location?.division ?? '',
    district: x?.district ?? x?.location?.district ?? '',
    address: x?.address ?? x?.location?.address ?? '',
    phone: x?.contactNumber ?? x?.phone ?? x?.contact?.phone ?? '',
    isVerified: !!(x?.isVerified ?? x?.verified),
    isActive: x?.isActive !== undefined ? !!x.isActive : x?.active !== undefined ? !!x.active : true,
    availableGroups: Array.isArray(x?.availableGroups) ? x.availableGroups : [],
    createdAt: x?.createdAt ?? null,
  };
}

const EMPTY_FORM = {
  name: '',
  division: '',
  district: '',
  address: '',
  contactNumber: '',
  isVerified: false,
  availableGroups: [],
};

function buildPayload(f, { includeAvailableGroups = false } = {}) {
  // Aligned with docs/02-ADMIN-API.md: name, address, division, district required;
  // optional contactNumber, latitude, longitude, isVerified; blood bank accepts availableGroups.
  const p = {
    name: f.name.trim(),
    address: f.address.trim(),
    division: f.division,
    district: f.district.trim(),
    isVerified: !!f.isVerified,
  };
  const contactNumber = String(f.contactNumber ?? '').trim();
  if (contactNumber) p.contactNumber = contactNumber;
  if (includeAvailableGroups) p.availableGroups = Array.isArray(f.availableGroups) ? f.availableGroups : [];
  return p;
}

function Field({ label, required, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-semibold text-gray-500">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}

function EntryForm({ apiBase, singular, editing, onClose, onSaved }) {
  const isBloodBank = apiBase.includes('blood-bank');
  const [form, setForm] = useState(() =>
    editing
      ? {
          name: editing.name ?? '',
          division: editing.division ?? '',
          district: editing.district ?? '',
          address: editing.address ?? '',
          contactNumber: editing.phone ?? '',
          isVerified: !!editing.isVerified,
          availableGroups: Array.isArray(editing.availableGroups) ? editing.availableGroups : [],
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleGroup = (group) => {
    setForm((f) => {
      const has = f.availableGroups.includes(group);
      return {
        ...f,
        availableGroups: has ? f.availableGroups.filter((g) => g !== group) : [...f.availableGroups, group],
      };
    });
  };

  const valid =
    form.name.trim().length > 0 &&
    form.division.length > 0 &&
    form.district.trim().length > 0 &&
    form.address.trim().length > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(form, { includeAvailableGroups: isBloodBank });
      if (editing) {
        // Docs note overlapping admin directory routes: try PUT (adminDirectory) then PATCH (admin.routes).
        try {
          await api.put(`${apiBase}/${editing.id}`, payload);
        } catch {
          await api.patch(`${apiBase}/${editing.id}`, payload);
        }
      } else {
        await api.post(apiBase, payload);
      }
      onSaved?.(editing ? `${singular} updated.` : `${singular} added ✓`);
    } catch (err) {
      setError(err?.message ?? 'Failed to save.');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${singular}` : `Add ${singular}`} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required full>
            <input
              className="input w-full"
              value={form.name}
              onChange={set('name')}
              placeholder={singular === 'Hospital' ? 'e.g. Dhaka Medical College Hospital' : 'e.g. Red Crescent Blood Bank'}
            />
          </Field>
          <Field label="Division" required>
            <select className="input w-full" value={form.division} onChange={set('division')}>
              <option value="">Select division…</option>
              {DIVISIONS.map((d) => {
                const o = opt(d);
                return (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="District" required>
            <input className="input w-full" value={form.district} onChange={set('district')} placeholder="e.g. Dhaka" />
          </Field>
          <Field label="Address" required full>
            <input
              className="input w-full"
              value={form.address}
              onChange={set('address')}
              placeholder="Street address / area"
            />
          </Field>
          <Field label="Contact Number">
            <input
              className="input w-full"
              value={form.contactNumber}
              onChange={set('contactNumber')}
              placeholder="01XXXXXXXXX"
            />
          </Field>
        </div>

        {isBloodBank && (
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-500">Available Blood Groups</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map((group) => {
                const active = form.availableGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-6 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <label className="flex items-center gap-3">
            <Toggle checked={form.isVerified} onChange={(v) => setForm((f) => ({ ...f, isVerified: v }))} />
            <span className="text-sm font-medium text-ink">Verified ✓</span>
          </label>
        </div>

        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="btn-outline text-sm">
            Cancel
          </button>
          <button onClick={save} disabled={!valid || saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : `Add ${singular}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DirectoryManager({ apiBase, singular, plural, icon }) {
  const admin = getAdmin();
  const canManage = admin?.role === 'super_admin' || admin?.role === 'content_admin';
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [division, setDivision] = useState('');
  const [verified, setVerified] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (division) params.set('division', division);
      if (verified) params.set('isVerified', verified);

      const res = await api.get(`${apiBase}?${params.toString()}`);
      // Directory endpoints may not use the standard {success,statusCode,message,data} envelope
      let d = res?.data ?? res ?? {};
      if (Array.isArray(d)) d = { items: d };
      if (Array.isArray(res) && !Array.isArray(res?.data)) d = { items: res };
      const list =
        d.items ??
        d.hospitals ??
        d.bloodBanks ??
        d.results ??
        (Array.isArray(res?.data) ? res.data : []);
      setRows((Array.isArray(list) ? list : []).map(normalizeItem));
      const p = d.pagination ?? res?.pagination ?? {};
      setPagination({
        page: p.page ?? page,
        totalPages: p.totalPages ?? p.pages ?? 1,
        total: p.total ?? p.count ?? (Array.isArray(list) ? list.length : 0),
      });
    } catch (err) {
      setError(err?.message ?? `Failed to load ${plural.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [apiBase, plural, page, debouncedSearch, division, verified]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const toggleVerify = async (row) => {
    if (!canManage) return;
    setBusyId(row.id);
    setError('');
    try {
      try {
        await api.patch(`${apiBase}/${row.id}/verify`, { isVerified: !row.isVerified });
      } catch {
        try {
          await api.put(`${apiBase}/${row.id}`, { isVerified: !row.isVerified });
        } catch {
          await api.patch(`${apiBase}/${row.id}`, { isVerified: !row.isVerified });
        }
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isVerified: !r.isVerified } : r)));
      setNotice(`${row.name} ${row.isVerified ? 'unverified' : 'verified ✓'}.`);
    } catch (err) {
      setError(err?.message ?? 'Verification toggle failed — try the Edit form instead.');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (!canManage || !deleting || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await api.del(`${apiBase}/${deleting.id}`);
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      setNotice(`${deleting.name} deleted.`);
      setDeleting(null);
    } catch (err) {
      setError(err?.message ?? 'Delete failed.');
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {icon} {r.name}
          </p>
          {r.address && <p className="truncate text-xs text-gray-400">{r.address}</p>}
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (r) => (
        <span className="text-sm text-gray-600">{[r.district, r.division].filter(Boolean).join(', ') || '—'}</span>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (r) => (
        <div>
          <p className="text-sm">{r.phone || '—'}</p>
          {r.email && <p className="text-xs text-gray-400">{r.email}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          {r.isVerified ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              ✓ Verified
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 ring-1 ring-gray-200">
              Unverified
            </span>
          )}
          {!r.isActive && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
              Inactive
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'added',
      label: 'Added',
      render: (r) => (
        <div>
          <p className="text-sm">{safeDate(r.createdAt)}</p>
          <p className="text-xs text-gray-400">{safeAgo(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        canManage ? (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleVerify(r)}
              disabled={busyId === r.id}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                r.isVerified
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {busyId === r.id ? '…' : r.isVerified ? 'Unverify' : 'Verify ✓'}
            </button>
            <button
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleting(r)}
              className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">View only</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title={plural} subtitle={`Manage the public ${plural.toLowerCase()} directory`}>
        <button onClick={fetchList} className="btn-outline text-sm">
          ↻ Refresh
        </button>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-primary text-sm"
          >
            + Add {singular}
          </button>
        )}
      </PageHeader>

      {notice && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>
      )}

      {/* filters */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <input
          className="input w-full sm:w-64"
          placeholder={`Search ${plural.toLowerCase()}…`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          value={division}
          onChange={(e) => {
            setDivision(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Divisions</option>
          {DIVISIONS.map((d) => {
            const o = opt(d);
            return (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            );
          })}
        </select>
        <select
          className="input"
          value={verified}
          onChange={(e) => {
            setVerified(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Verified + Unverified</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </select>
      </div>

      {error && !loading && (
        <div className="card mb-5 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchList} className="btn-outline mt-3 text-sm">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey="id"
        emptyIcon={icon}
        emptyTitle={`No ${plural.toLowerCase()} found`}
        emptyText={canManage ? `Click "+ Add ${singular}" to create the first entry.` : `No ${plural.toLowerCase()} available.`}
        onRowClick={
          canManage
            ? (r) => {
                setEditing(r);
                setFormOpen(true);
              }
            : undefined
        }
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />

      {formOpen && (
        <EntryForm
          apiBase={apiBase}
          singular={singular}
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={(msg) => {
            setNotice(msg);
            setFormOpen(false);
            setEditing(null);
            fetchList();
          }}
        />
      )}

      {/* delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${singular}?`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong className="text-ink">{deleting?.name}</strong>? This action will be
            audit-logged.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="btn-outline text-sm">
              Cancel
            </button>
            <button
              onClick={doDelete}
              disabled={deleteBusy}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}