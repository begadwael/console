import type {
  Job,
  SideWorkTask,
  PartTimeEntry,
  Project,
  Invoice,
} from "./types";
import { MODULE } from "./meta";
import { toISO } from "./utils";

// A single dated thing surfaced on the calendar / agenda.
export interface AgendaEvent {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  sub: string;
  color: string;
  href: string;
  done?: boolean;
}

interface AgendaInput {
  jobs: Job[];
  sidework: SideWorkTask[];
  partTime: PartTimeEntry[];
  projects: Project[];
  invoices: Invoice[];
}

// Flatten every dated item across modules into one event list.
export function buildAgenda({
  jobs,
  sidework,
  partTime,
  projects,
  invoices,
}: AgendaInput): AgendaEvent[] {
  const out: AgendaEvent[] = [];

  for (const j of jobs) {
    if (j.nextActionDate && j.status !== "rejected") {
      out.push({
        id: `job-${j.id}`,
        date: j.nextActionDate,
        title: j.nextAction || `Follow up · ${j.company}`,
        sub: `${MODULE.jobs.label} · ${j.company}`,
        color: MODULE.jobs.color,
        href: "/jobs",
      });
    }
  }

  for (const t of sidework) {
    if (t.dueDate) {
      out.push({
        id: `sidework-${t.id}`,
        date: t.dueDate,
        title: t.title,
        sub: `${MODULE.sidework.label}${t.client ? ` · ${t.client}` : ""}`,
        color: MODULE.sidework.color,
        href: "/sidework",
        done: t.status === "done",
      });
    }
  }

  for (const e of partTime) {
    out.push({
      id: `pt-${e.id}`,
      date: e.date,
      title: e.task,
      sub: `${MODULE["part-time"].label} · ${e.hours}h`,
      color: MODULE["part-time"].color,
      href: "/part-time",
      done: e.done,
    });
  }

  for (const p of projects) {
    const accent = p.color ?? MODULE.projects.color;
    if (p.dueDate && p.status !== "done") {
      out.push({
        id: `proj-${p.id}`,
        date: p.dueDate,
        title: `${p.name} due`,
        sub: MODULE.projects.label,
        color: accent,
        href: `/projects/${p.id}`,
      });
    }
    for (const m of p.milestones) {
      if (m.date) {
        out.push({
          id: `ms-${p.id}-${m.id}`,
          date: m.date,
          title: m.title,
          sub: `${p.name} · Milestone`,
          color: accent,
          href: `/projects/${p.id}`,
          done: m.done,
        });
      }
    }
    for (const task of p.tasks) {
      if (task.dueDate) {
        out.push({
          id: `pt-${p.id}-${task.id}`,
          date: task.dueDate,
          title: task.title,
          sub: `${p.name} · Task`,
          color: accent,
          href: `/projects/${p.id}`,
          done: task.status === "done",
        });
      }
    }
  }

  for (const inv of invoices) {
    if (inv.dueDate && inv.status !== "paid") {
      out.push({
        id: `inv-${inv.id}`,
        date: inv.dueDate,
        title: `Invoice · ${inv.client}`,
        sub: `${MODULE.income.label} · ${inv.title ?? ""}`.trim(),
        color: MODULE.income.color,
        href: "/income",
      });
    }
  }

  return out;
}

// Group events by ISO date for quick lookup.
export function groupByDate(
  events: AgendaEvent[],
): Record<string, AgendaEvent[]> {
  const map: Record<string, AgendaEvent[]> = {};
  for (const e of events) (map[e.date] ??= []).push(e);
  return map;
}

// 6×7 grid of ISO dates covering the month, weeks starting Sunday.
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to Sunday
  const weeks: string[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
