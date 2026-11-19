export default function DataTable({
  columns,
  rows,
  loading,
  emptyIcon = '📭',
  emptyTitle = 'No results found',
  emptyText,
  rowKey = '_id',
  onRowClick,
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/5 bg-[#FAFAFC]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-ink/40"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-ink/5">
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-ink/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14 text-center">
                  <div className="text-4xl">{emptyIcon}</div>
                  <p className="mt-3 font-semibold text-ink">{emptyTitle}</p>
                  {emptyText && <p className="mt-1 text-sm text-ink/50">{emptyText}</p>}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row[rowKey]}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-ink/5 transition last:border-0 ${
                    onRowClick ? 'cursor-pointer hover:bg-cream/60' : ''
                  }`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-4 text-ink/70">
                      {c.render ? c.render(row) : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}