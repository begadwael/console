import Link from "next/link";
import { readCollection } from "@/lib/store";
import { projectProgress } from "@/lib/projects";
import { PROJECT_STATUS_META } from "@/lib/meta";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/Badge";
import { SideWorkBoard } from "./SideWorkBoard";

export default async function SideWorkPage() {
  const [tasks, projects] = await Promise.all([
    readCollection("sidework"),
    readCollection("projects"),
  ]);
  const sideworkProjects = projects.filter((p) => p.sidework);

  return (
    <>
      <SideWorkBoard tasks={tasks} />

      {sideworkProjects.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow flex items-center gap-2">
              <Icons.projects size={13} className="text-sidework" />
              Side work projects
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              All projects <Icons.arrow size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sideworkProjects.map((p) => {
              const { done, total, pct } = projectProgress(p);
              const accent = p.color ?? "var(--projects)";
              const sm = PROJECT_STATUS_META[p.status];
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-text">
                      {p.name}
                    </span>
                    <Badge color={sm.color} dot>
                      {sm.label}
                    </Badge>
                  </div>
                  {p.client ? (
                    <p className="mt-0.5 text-xs text-text-muted">{p.client}</p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="eyebrow">Tasks · {pct}%</span>
                    <span className="tnum text-[11px] text-text-faint">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: accent }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
