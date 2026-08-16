export function EmptyState({ title = "No records yet", message = "When the backend returns records, they will appear here." }: { title?: string; message?: string }) {
  return <div className="rounded-xl border border-dashed border-forge-border p-8 text-center"><strong>{title}</strong><p className="mt-2 text-sm text-forge-muted">{message}</p></div>;
}
