"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icons, type LucideIcon } from "@/components/ui/icons";
import { ThemeToggle } from "./ThemeToggle";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { href: "/", label: "Overview", icon: Icons.overview, color: "var(--accent)" },
  {
    href: "/calendar",
    label: "Calendar",
    icon: Icons.calendar2,
    color: "var(--accent)",
  },
  { href: "/jobs", label: "Job search", icon: Icons.jobs, color: "var(--jobs)" },
  { href: "/sidework", label: "Side work", icon: Icons.sidework, color: "var(--sidework)" },
  {
    href: "/projects",
    label: "Projects",
    icon: Icons.projects,
    color: "var(--projects)",
  },
  {
    href: "/budget",
    label: "Budget",
    icon: Icons.budget,
    color: "var(--budget)",
  },
  {
    href: "/part-time",
    label: "Part-time",
    icon: Icons.partTime,
    color: "var(--parttime)",
  },
  {
    href: "/personal",
    label: "Personal",
    icon: Icons.personal,
    color: "var(--personal)",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 flex w-full flex-col gap-1 border-b border-border bg-bg-elevated/95 p-3 backdrop-blur md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:backdrop-blur-none">
      <div className="flex items-center gap-2.5 px-2 pb-3 pt-1 md:pb-4 md:pt-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/25">
          <Icons.overview size={17} />
        </span>
        <div className="leading-tight">
          <p className="eyebrow">Personal</p>
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-text">
            Console
          </h1>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <nav className="no-scrollbar -mx-1 flex flex-row gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-full md:block"
                  style={{ backgroundColor: item.color }}
                />
              ) : null}
              <Icon
                size={17}
                style={{ color: active ? item.color : undefined }}
                className="transition-colors"
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden px-2 pb-1 pt-4 md:block">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 py-2">
          <kbd className="tnum flex h-5 w-5 items-center justify-center rounded border border-border-strong bg-bg-elevated text-[11px] text-text-muted">
            N
          </kbd>
          <span className="text-[11px] text-text-faint">Quick add</span>
        </div>
      </div>
    </aside>
  );
}
