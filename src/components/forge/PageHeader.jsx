export function PageHeader({ title, subtitle, meta, actions, tint = true }) {
  return (
    <header className="mb-4">
      {tint && <div className="h-0.5 w-10 rounded-full bg-tint mb-3" aria-hidden />}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4
                      sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
