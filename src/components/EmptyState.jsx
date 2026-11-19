export default function EmptyState({ icon = '📭', title = 'Nothing here yet', text, children }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="font-display mt-4 text-lg font-bold text-ink">{title}</h3>
      {text && <p className="mx-auto mt-2 max-w-sm text-sm text-ink/50">{text}</p>}
      {children}
    </div>
  );
}