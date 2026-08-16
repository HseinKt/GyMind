import { Input } from "./Input";

export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (next: { from: string; to: string }) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input type="date" value={from} onChange={(event) => onChange({ from: event.target.value, to })} />
      <Input type="date" value={to} onChange={(event) => onChange({ from, to: event.target.value })} />
    </div>
  );
}
