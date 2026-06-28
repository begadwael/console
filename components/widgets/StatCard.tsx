import Link from "next/link";
import { Icons, type LucideIcon } from "@/components/ui/icons";

export function StatCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg-elevated transition-transform group-hover:scale-105"
          style={{ color }}
        >
          <Icon size={15} />
        </span>
      </div>
      <p className="tnum mt-3 text-3xl font-semibold text-text">{value}</p>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-text-faint">
        {hint ? <span>{hint}</span> : null}
        <Icons.arrow
          size={11}
          className="ml-auto -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
          style={{ color }}
        />
      </div>
    </Link>
  );
}
