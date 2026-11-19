const STYLES = {
  // user / donor states
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending_verification: 'bg-amber-50 text-amber-700 ring-amber-200',
  suspended: 'bg-orange-50 text-orange-700 ring-orange-200',
  banned: 'bg-red-50 text-red-700 ring-red-200',
  deleted: 'bg-gray-100 text-gray-500 ring-gray-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unavailable: 'bg-gray-100 text-gray-500 ring-gray-200',
  recently_donated: 'bg-blue-50 text-blue-700 ring-blue-200',
  paused: 'bg-amber-50 text-amber-700 ring-amber-200',
  // request states
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  expired: 'bg-gray-100 text-gray-500 ring-gray-200',
  cancelled: 'bg-gray-100 text-gray-500 ring-gray-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  // report states
  under_review: 'bg-blue-50 text-blue-700 ring-blue-200',
  reviewing: 'bg-blue-50 text-blue-700 ring-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  dismissed: 'bg-gray-100 text-gray-500 ring-gray-200',
};

export default function StatusBadge({ status }) {
  const key = String(status ?? '').toLowerCase();
  const cls = STYLES[key] ?? 'bg-gray-100 text-gray-600 ring-gray-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${cls}`}
    >
      {key ? key.replaceAll('_', ' ') : '—'}
    </span>
  );
}