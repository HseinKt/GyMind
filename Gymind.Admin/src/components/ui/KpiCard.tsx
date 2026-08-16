import { Card } from "./Card";

export function KpiCard({ label, value, meta }: { label: string; value: React.ReactNode; meta?: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-forge-muted">{label}</p>
      <strong className="mt-2 block break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value ?? 0}</strong>
      {meta ? <span className="mt-2 block text-xs text-forge-muted">{meta}</span> : null}
    </Card>
  );
}
