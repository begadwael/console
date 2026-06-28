import type { Project, Milestone } from "./types";
import { daysUntil } from "./utils";

// Task completion as a 0–100 percentage. A task counts as fully done when its
// status is done; otherwise it earns partial credit for completed subtasks, so
// progress moves as checklist items get ticked — not only when a card is closed.
export function projectProgress(p: Project): {
  done: number;
  total: number;
  pct: number;
} {
  const total = p.tasks.length;
  const done = p.tasks.filter((t) => t.status === "done").length;
  if (total === 0) return { done, total, pct: 0 };

  let credit = 0;
  for (const t of p.tasks) {
    if (t.status === "done") {
      credit += 1;
    } else if (t.subtasks.length > 0) {
      credit += t.subtasks.filter((s) => s.done).length / t.subtasks.length;
    }
  }
  return { done, total, pct: Math.round((credit / total) * 100) };
}

// The soonest upcoming (not-done) dated milestone, if any.
export function nextMilestone(p: Project): Milestone | null {
  const upcoming = p.milestones
    .filter((m) => !m.done && m.date)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  return upcoming[0] ?? null;
}

// Sort milestones chronologically; undated ones sink to the bottom.
export function sortedMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

export function isOverdue(iso?: string): boolean {
  return !!iso && daysUntil(iso) < 0;
}
