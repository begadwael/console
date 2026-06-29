import Link from "next/link";
import { readCollection } from "@/lib/store";
import {
  todayISO,
  parseISO,
  daysUntil,
  dueLabel,
  formatDate,
} from "@/lib/utils";
import { JOB_STATUS_META, MODULE } from "@/lib/meta";
import { projectProgress } from "@/lib/projects";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/widgets/StatCard";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Icons, MODULE_ICON } from "@/components/ui/icons";

const TONE_COLOR = {
  overdue: "var(--danger)",
  soon: "var(--warning)",
  later: "var(--text-faint)",
} as const;

interface Deadline {
  id: string;
  date: string;
  title: string;
  sub: string;
  color: string;
  href: string;
}

export default async function OverviewPage() {
  const [jobs, tasks, partTime, personal, projects, invoices] =
    await Promise.all([
      readCollection("jobs"),
      readCollection("sidework"),
      readCollection("part-time"),
      readCollection("personal"),
      readCollection("projects"),
      readCollection("invoices"),
    ]);

  const activeProjects = projects.filter((p) => p.status === "active");
  const activeJobs = jobs.filter((j) => j.status !== "rejected");
  const interviewing = jobs.filter((j) => j.status === "interviewing").length;
  const offers = jobs.filter((j) => j.status === "offer").length;
  const openTasks = tasks.filter((t) => t.status !== "done");

  const today = parseISO(todayISO()).getTime();
  const weekHours = partTime
    .filter((e) => {
      const diff = (today - parseISO(e.date).getTime()) / 86_400_000;
      return diff >= 0 && diff < 7;
    })
    .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

  const habits = personal.filter((p) => p.type === "habit");
  const habitsDoneToday = habits.filter((h) => h.lastDone === todayISO()).length;

  // Unified upcoming deadlines (overdue + next 7 days).
  const deadlines: Deadline[] = [];
  for (const j of jobs) {
    if (j.nextActionDate && j.status !== "rejected") {
      deadlines.push({
        id: `job-${j.id}`,
        date: j.nextActionDate,
        title: j.nextAction || `Follow up · ${j.company}`,
        sub: `${MODULE.jobs.label} · ${j.company}`,
        color: MODULE.jobs.color,
        href: "/jobs",
      });
    }
  }
  for (const t of tasks) {
    if (t.dueDate && t.status !== "done") {
      deadlines.push({
        id: `sidework-${t.id}`,
        date: t.dueDate,
        title: t.title,
        sub: `${MODULE.sidework.label}${t.client ? ` · ${t.client}` : ""}`,
        color: MODULE.sidework.color,
        href: "/sidework",
      });
    }
  }
  for (const e of partTime) {
    if (!e.done && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7) {
      deadlines.push({
        id: `pt-${e.id}`,
        date: e.date,
        title: e.task,
        sub: `${MODULE["part-time"].label} · ${e.hours}h`,
        color: MODULE["part-time"].color,
        href: "/part-time",
      });
    }
  }
  for (const p of projects) {
    if (p.dueDate && p.status !== "done") {
      deadlines.push({
        id: `proj-${p.id}`,
        date: p.dueDate,
        title: `${p.name} due`,
        sub: `${MODULE.projects.label}${p.client ? ` · ${p.client}` : ""}`,
        color: p.color ?? MODULE.projects.color,
        href: `/projects/${p.id}`,
      });
    }
  }
  for (const inv of invoices) {
    if (inv.dueDate && inv.status === "sent") {
      deadlines.push({
        id: `inv-${inv.id}`,
        date: inv.dueDate,
        title: `Invoice · ${inv.client}`,
        sub: `${MODULE.income.label} · ${inv.title ?? ""}`.trim(),
        color: MODULE.income.color,
        href: MODULE.income.href,
      });
    }
  }
  const upcoming = deadlines
    .filter((d) => daysUntil(d.date) <= 7)
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayPretty = parseISO(todayISO()).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="mb-6">
        <p className="eyebrow mb-2">{todayPretty}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
          Overview
        </h1>
      </div>

      {/* Stat row */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          href="/jobs"
          icon={MODULE_ICON.jobs}
          label="Active apps"
          value={activeJobs.length}
          hint={`${interviewing} interviewing · ${offers} offer${offers === 1 ? "" : "s"}`}
          color={MODULE.jobs.color}
        />
        <StatCard
          href="/sidework"
          icon={MODULE_ICON.sidework}
          label="Open Side work tasks"
          value={openTasks.length}
          hint={`${tasks.length - openTasks.length} done`}
          color={MODULE.sidework.color}
        />
        <StatCard
          href="/part-time"
          icon={MODULE_ICON["part-time"]}
          label="Part-time hours"
          value={`${weekHours}h`}
          hint="this week"
          color={MODULE["part-time"].color}
        />
        <StatCard
          href="/personal"
          icon={MODULE_ICON.personal}
          label="Habits today"
          value={`${habitsDoneToday}/${habits.length}`}
          hint="completed"
          color={MODULE.personal.color}
        />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upcoming"
            subtitle="Overdue · next 7 days"
            icon={<Icons.calendar size={15} />}
            accent="var(--accent)"
          />
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={Icons.celebrate}
                message="Nothing due soon. Enjoy the calm."
              />
            ) : (
              <ul className="flex flex-col">
                {upcoming.map((d, i) => {
                  const days = daysUntil(d.date);
                  const tone =
                    days < 0 ? "overdue" : days <= 2 ? "soon" : "later";
                  return (
                    <li key={d.id}>
                      <Link
                        href={d.href}
                        className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover ${i > 0 ? "border-t border-border" : ""}`}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">
                            {d.title}
                          </p>
                          <p className="truncate text-xs text-text-faint">
                            {d.sub}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className="tnum text-xs font-medium"
                            style={{ color: TONE_COLOR[tone] }}
                          >
                            {dueLabel(d.date)}
                          </p>
                          <p className="tnum text-[11px] text-text-faint">
                            {formatDate(d.date)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Job pipeline */}
        <Card accent={MODULE.jobs.color}>
          <CardHeader
            title="Job pipeline"
            icon={<Icons.jobs size={15} />}
            accent={MODULE.jobs.color}
          />
          <CardBody className="space-y-2.5">
            {jobs.length === 0 ? (
              <EmptyState icon={Icons.jobs} message="No applications yet." />
            ) : (
              (["saved", "applied", "interviewing", "offer"] as const).map(
                (s) => {
                  const meta = JOB_STATUS_META[s];
                  const count = jobs.filter((j) => j.status === s).length;
                  return (
                    <div
                      key={s}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-text-muted">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                      <span className="tnum font-medium text-text">{count}</span>
                    </div>
                  );
                },
              )
            )}
            <Link
              href="/jobs"
              className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View board <Icons.arrow size={12} />
            </Link>
          </CardBody>
        </Card>

        {/* Habit streaks */}
        <Card accent={MODULE.personal.color}>
          <CardHeader
            title="Habit streaks"
            icon={<Icons.flame size={15} />}
            accent={MODULE.personal.color}
          />
          <CardBody className="space-y-2.5">
            {habits.length === 0 ? (
              <EmptyState icon={Icons.habit} message="No habits yet." />
            ) : (
              habits
                .slice()
                .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))
                .map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-text-muted">{h.title}</span>
                    <span className="flex shrink-0 items-center gap-1 font-medium text-personal">
                      <Icons.flame size={13} />
                      <span className="tnum">{h.streak ?? 0}</span>
                    </span>
                  </div>
                ))
            )}
          </CardBody>
        </Card>

        {/* Side work focus */}
        <Card className="lg:col-span-2" accent={MODULE.sidework.color}>
          <CardHeader
            title="Side work focus"
            subtitle="Open · highest priority first"
            icon={<Icons.sidework size={15} />}
            accent={MODULE.sidework.color}
          />
          <CardBody>
            {openTasks.length === 0 ? (
              <EmptyState icon={Icons.done} message="No open Side work tasks." />
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {openTasks
                  .slice()
                  .sort((a, b) => {
                    const rank = { high: 0, medium: 1, low: 2 };
                    return rank[a.priority] - rank[b.priority];
                  })
                  .slice(0, 6)
                  .map((t) => (
                    <li key={t.id}>
                      <Link
                        href="/sidework"
                        className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated/40 px-3 py-2 transition-colors hover:bg-surface-hover"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              t.priority === "high"
                                ? "var(--danger)"
                                : t.priority === "medium"
                                  ? "var(--warning)"
                                  : "var(--text-faint)",
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-text">
                          {t.title}
                        </span>
                        {t.dueDate ? (
                          <span className="tnum shrink-0 text-[11px] text-text-faint">
                            {dueLabel(t.dueDate)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Active projects */}
        <Card className="lg:col-span-3" accent={MODULE.projects.color}>
          <CardHeader
            title="Active projects"
            subtitle="Deliverable progress at a glance"
            icon={<Icons.projects size={15} />}
            accent={MODULE.projects.color}
            action={
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
              >
                All projects <Icons.arrow size={12} />
              </Link>
            }
          />
          <CardBody>
            {activeProjects.length === 0 ? (
              <EmptyState
                icon={Icons.projects}
                message="No active projects right now."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeProjects.map((p) => {
                  const { done, total, pct } = projectProgress(p);
                  const accent = p.color ?? MODULE.projects.color;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="block rounded-lg border border-border bg-bg-elevated/40 p-3 transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-medium text-text">
                            {p.name}
                          </span>
                          <span className="tnum shrink-0 text-[11px] text-text-faint">
                            {done}/{total}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: accent }}
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
