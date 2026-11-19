export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EnConstruccion({ fase, detalle }: { fase: number; detalle: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Fase {fase}
      </span>
      <p className="mt-3 max-w-md text-sm text-slate-600">{detalle}</p>
    </div>
  );
}
