import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  accent,
}: {
  className?: string;
  children: React.ReactNode;
  accent?: string; // optional accent color for the header rule + glow
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface",
        "shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  accent,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg-elevated"
            style={accent ? { color: accent } : undefined}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-text">
            {title}
          </h3>
          {subtitle ? (
            <p className="eyebrow mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}
