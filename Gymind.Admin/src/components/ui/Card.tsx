export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-forge-border bg-white p-5 shadow-panel ${className}`}>{children}</section>;
}
