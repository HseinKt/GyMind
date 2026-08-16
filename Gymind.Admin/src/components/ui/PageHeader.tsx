export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-forge-primary">Gymind</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-forge-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
