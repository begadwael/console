"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  TASK_STATUSES,
  PRIORITIES,
  type SideWorkTask,
  type TaskStatus,
} from "@/lib/types";
import { TASK_STATUS_META, PRIORITY_META, MODULE } from "@/lib/meta";
import { newId, dueLabel, dueTone, cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { Field, Input, Textarea, Segmented } from "@/components/ui/form";
import { Kanban, type Column } from "@/components/board/Kanban";
import { Icons } from "@/components/ui/icons";
import { saveTask, deleteTask } from "./actions";

const COLUMNS: Column[] = TASK_STATUSES.map((s) => ({
  id: s,
  label: TASK_STATUS_META[s].label,
  color: TASK_STATUS_META[s].color,
}));

const TONE_COLOR = {
  overdue: "var(--danger)",
  soon: "var(--warning)",
  later: "var(--text-faint)",
} as const;

function emptyTask(status: TaskStatus = "todo"): SideWorkTask {
  return { id: "", title: "", status, priority: "medium" };
}

export function SideWorkBoard({ tasks }: { tasks: SideWorkTask[] }) {
  const [items, setItems] = useState(tasks);
  const [prevSig, setPrevSig] = useState("");
  const [draft, setDraft] = useState<SideWorkTask | null>(null);
  const [pending, startTransition] = useTransition();

  // Sync local state when the server sends fresh data; adjusting state during
  // render is React's recommended pattern over a setState-in-effect.
  const sig = tasks.map((t) => `${t.id}:${t.status}:${t.title}`).join("|");
  if (sig !== prevSig) {
    setPrevSig(sig);
    setItems(tasks);
  }

  function move(id: string, toStatus: string) {
    const status = toStatus as TaskStatus;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const task = items.find((t) => t.id === id);
    if (task) startTransition(() => saveTask({ ...task, status }));
  }

  function save() {
    if (!draft) return;
    const record: SideWorkTask = { ...draft, id: draft.id || newId() };
    setItems((prev) => {
      const exists = prev.some((t) => t.id === record.id);
      return exists
        ? prev.map((t) => (t.id === record.id ? record : t))
        : [...prev, record];
    });
    startTransition(async () => {
      await saveTask(record);
      setDraft(null);
    });
  }

  function del() {
    if (!draft?.id) return;
    const id = draft.id;
    setItems((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await deleteTask(id);
      setDraft(null);
    });
  }

  return (
    <>
      <PageHeader
        title="Side work"
        eyebrow="Client deliverables"
        subtitle="Drag tasks across stages as you make progress."
        accent={MODULE.sidework.color}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/sidework/finance"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Icons.finance size={15} />
              Finance
            </Link>
            <Link
              href="/sidework/clients"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Icons.clients size={15} />
              Clients
            </Link>
            <Button variant="primary" onClick={() => setDraft(emptyTask())}>
              <Icons.plus size={16} />
              Add task
            </Button>
          </div>
        }
      />

      <Kanban
        columns={COLUMNS}
        items={items}
        onMove={move}
        onAdd={(status) => setDraft(emptyTask(status as TaskStatus))}
        renderCard={(task) => {
          const tone = dueTone(task.dueDate);
          const pri = PRIORITY_META[task.priority];
          return (
            <button
              onClick={() => setDraft(task)}
              className={cn(
                "w-full rounded-lg border border-border bg-surface p-3 pr-7 text-left transition-colors hover:border-border-strong hover:bg-surface-hover",
                task.status === "done" && "opacity-65",
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium text-text",
                  task.status === "done" && "line-through",
                )}
              >
                {task.title}
              </p>
              {task.client ? (
                <p className="text-xs text-text-muted">{task.client}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge color={pri.color} dot>
                  {pri.label}
                </Badge>
                {task.dueDate ? (
                  <span
                    className="tnum text-[11px]"
                    style={{
                      color: tone ? TONE_COLOR[tone] : "var(--text-faint)",
                    }}
                  >
                    {dueLabel(task.dueDate)}
                  </span>
                ) : null}
              </div>
            </button>
          );
        }}
      />

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Side work"
        title={draft?.id ? "Edit task" : "Add task"}
      >
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            }}
          >
            <Field label="Title" required>
              <Input
                autoFocus
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Client">
                <Input
                  value={draft.client ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, client: e.target.value })
                  }
                />
              </Field>
              <Field label="Due">
                <Input
                  type="date"
                  value={draft.dueDate ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, dueDate: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Stage">
              <Segmented
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                options={TASK_STATUSES.map((s) => ({
                  value: s,
                  label: TASK_STATUS_META[s].label,
                  color: TASK_STATUS_META[s].color,
                }))}
              />
            </Field>

            <Field label="Priority">
              <Segmented
                value={draft.priority}
                onChange={(priority) => setDraft({ ...draft, priority })}
                options={PRIORITIES.map((p) => ({
                  value: p,
                  label: PRIORITY_META[p].label,
                  color: PRIORITY_META[p].color,
                }))}
              />
            </Field>

            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            <ModalActions
              onCancel={() => setDraft(null)}
              onDelete={draft.id ? del : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
