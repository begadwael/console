export function PageHeader({
  title,
  subtitle,
  eyebrow,
  accent,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="eyebrow mb-2 flex items-center gap-2">
            {accent ? (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: accent }}
              />
            ) : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
