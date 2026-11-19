'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { DIVISIONS, BLOOD_GROUPS, AVAILABILITY_OPTIONS } from '@/constants/options';
import { formatDate, getInitials } from '@/lib/format';

export default function DonorsPage() {
  const [search, setSearch] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [division, setDivision] = useState('');
  const [availability, setAvailability] = useState('');
  const [verified, setVerified] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Availability change modal
  const [target, setTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('available');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (bloodGroup) qs.set('bloodGroup', bloodGroup);
      if (division) qs.set('division', division);
      if (availability) qs.set('availability', availability);
      if (verified) qs.set('verified', verified);
      qs.set('page', String(page));
      qs.set('limit', '15');

      const res = await api.get(`/admin/donors?${qs.toString()}`);
      const d = res?.data ?? {};
      const list = d.donors ?? d.items ?? [];
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
  }, [search, bloodGroup, division, availability, verified, page]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, bloodGroup, division, availability, verified, page]);

  const saveAvailability = async () => {
    if (!target) return;
    setSaving(true);
    setModalError('');
    try {
      await api.patch(`/admin/donors/${target._id}/availability`, { status: newStatus });
      setNotice(`✅ Availability updated to "${newStatus.replaceAll('_', ' ')}" — audit-logged.`);
      setTarget(null);
      await load();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const donorUser = (d) => d.user ?? {};

  const columns = [
    {
      key: 'donor',
      label: 'Donor',
      render: (d) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {getInitials(donorUser(d).fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {donorUser(d).fullName || 'Unknown'}
              {(donorUser(d).isVerified || d.isVerified) && (
                <span className="ml-1 text-blue-500">✓</span>
              )}
            </p>
            <p className="truncate text-xs text-ink/50">{donorUser(d).email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'bloodGroup',
      label: 'Group',
      render: (d) => (
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
          {d.bloodGroup}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (d) =>
        [d.address?.district, d.address?.division].filter(Boolean).join(', ') || '—',
    },
    { key: 'availability', label: 'Availability', render: (d) => <StatusBadge status={d.availabilityStatus} /> },
    { key: 'donations', label: 'Donations', render: (d) => d.totalDonationCount ?? 0 },
    { key: 'lastDonation', label: 'Last Donation', render: (d) => formatDate(d.lastDonationDate) },
    {
      key: 'actions',
      label: '',
      render: (d) => (
        <button
          onClick={() => {
            setTarget(d);
            setNewStatus(d.availabilityStatus || 'available');
            setModalError('');
          }}
          className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary"
        >
          Change Status
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Donors" subtitle="Manage donor availability and review profiles" />

      {/* Filters */}
      <div className="card mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search donor..."
          className="input lg:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <select value={bloodGroup} onChange={(e) => { setPage(1); setBloodGroup(e.target.value); }} className="input sm:w-32">
            <option value="">All Groups</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={division} onChange={(e) => { setPage(1); setDivision(e.target.value); }} className="input sm:w-40">
            <option value="">All Divisions</option>
            {DIVISIONS.map((dv) => <option key={dv} value={dv}>{dv}</option>)}
          </select>
          <select value={availability} onChange={(e) => { setPage(1); setAvailability(e.target.value); }} className="input sm:w-44">
            <option value="">All Availability</option>
            {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={verified} onChange={(e) => { setPage(1); setVerified(e.target.value); }} className="input sm:w-36">
            <option value="">Verified + Not</option>
            <option value="true">Verified Only</option>
            <option value="false">Not Verified</option>
          </select>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          ⚠️ {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        emptyIcon="🩸"
        emptyTitle="No donors found"
        emptyText="Try a different filter — donors will appear as they register."
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPage={setPage}
      />

      {/* Availability modal */}
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="🩸 Change Availability"
      >
        <p className="text-sm text-ink/60">
          Donor: <strong className="text-ink">{target ? donorUser(target).fullName : ''}</strong>
        </p>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="input mt-4"
        >
          {AVAILABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-ink/40">
          ⚠️ Cooldown-এ থাকা donor-কে &quot;available&quot; করলে backend 409 error দিতে পারে।
        </p>
        {modalError && (
          <div className="mt-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            ⚠️ {modalError}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={() => setTarget(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={saveAvailability} disabled={saving} className="btn-primary flex-1 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Change'}
          </button>
        </div>
      </Modal>
    </div>
  );
}