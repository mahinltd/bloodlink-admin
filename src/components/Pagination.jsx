'use client';

export default function Pagination({ page = 1, totalPages = 1, total, onPage }) {
  if (!totalPages || totalPages <= 1) return null;

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = [];
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) pages.push(i);

  const btn = 'h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition';

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-ink/40">
        Page <strong className="text-ink">{page}</strong> of {totalPages}
        {total != null && <> • <strong className="text-ink">{total}</strong> records</>}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={`${btn} border border-ink/10 disabled:opacity-30`}
        >
          ← Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`${btn} ${
              p === page
                ? 'bg-primary text-white shadow-sm'
                : 'border border-ink/10 hover:border-primary hover:text-primary'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className={`${btn} border border-ink/10 disabled:opacity-30`}
        >
          Next →
        </button>
      </div>
    </div>
  );
}