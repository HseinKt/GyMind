export function LoadingState({ label = "Loading live data..." }: { label?: string }) {
  return <div className="rounded-2xl border border-forge-border bg-white p-8 text-center text-sm font-medium text-forge-muted shadow-panel">{label}</div>;
}
