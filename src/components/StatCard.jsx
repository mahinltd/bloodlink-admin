const ACCENTS = {
  primary: 'bg-primary/10 text-primary',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
};

export default function StatCard({ icon, label, value, sub, accent = 'primary' }) {
  return (
    <div className="card p-5 transition hover:shadow-md sm:p-6">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${ACCENTS[accent]}`}
      >
        {icon}
      </div>
      <p className="font-display mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink/40">
        {label}
      </p>
      {sub && <p className="mt-2 text-xs text-ink/50">{sub}</p>}
    </div>
  );
}