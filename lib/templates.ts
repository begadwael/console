import type { Project, ProjectTemplate } from "./types";
import { newId, addDays, daysBetween } from "./utils";

// Build a concrete Project from a template, anchored to a start date.
// offsetDays become real dates; subtask titles become subtask records.
export function instantiateTemplate(
  t: ProjectTemplate,
  startISO: string,
): Project {
  const at = (offset?: number) =>
    offset === undefined ? undefined : addDays(startISO, offset);
  return {
    id: newId(),
    name: t.name,
    description: t.description,
    status: "active",
    sidework: t.sidework ?? true,
    color: t.color,
    startDate: startISO,
    dueDate: t.durationDays !== undefined ? addDays(startISO, t.durationDays) : undefined,
    createdAt: new Date().toISOString(),
    milestones: t.milestones.map((m) => ({
      id: newId(),
      title: m.title,
      date: at(m.offsetDays),
      done: false,
    })),
    tasks: t.tasks.map((task) => ({
      id: newId(),
      title: task.title,
      description: task.description,
      status: "todo",
      priority: task.priority ?? "medium",
      dueDate: at(task.offsetDays),
      subtasks: (task.subtasks ?? []).map((title) => ({
        id: newId(),
        title,
        done: false,
      })),
    })),
    documents: t.documents.map((d) => ({
      id: newId(),
      title: d.title,
      kind: "link" as const,
      url: d.url ?? "",
    })),
  };
}

// Derive a reusable template from an existing project (dates → offsets).
export function projectToTemplate(
  p: Project,
  name: string,
): ProjectTemplate {
  const offset = (iso?: string) =>
    p.startDate && iso ? daysBetween(p.startDate, iso) : undefined;
  return {
    id: newId(),
    name,
    description: p.description,
    sidework: p.sidework,
    color: p.color,
    durationDays: offset(p.dueDate),
    milestones: p.milestones.map((m) => ({
      title: m.title,
      offsetDays: offset(m.date),
    })),
    tasks: p.tasks.map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      offsetDays: offset(t.dueDate),
      subtasks: t.subtasks.map((s) => s.title),
    })),
    documents: p.documents.map((d) => ({
      title: d.title,
      url: d.kind === "link" ? d.url : undefined,
    })),
    createdAt: new Date().toISOString(),
  };
}
