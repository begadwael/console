"use client";

import { useState, useTransition } from "react";
import type { PartTimeEntry } from "@/lib/types";
import { MODULE } from "@/lib/meta";
import { newId, todayISO, formatDate, parseISO, cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { saveEntry, deleteEntry } from "./actions";

function emptyEntry(): PartTimeEntry {
  return { id: "", date: todayISO(), task: "", hours: 1, done: false };
}

function hoursThisWeek(entries: PartTimeEntry[]): number {
  const today = parseISO(todayISO()).getTime();
  return entries
    .filter((e) => {
      const diff = (today - parseISO(e.date).getTime()) / 86_400_000;
      return diff >= 0 && diff < 7;
    })
    .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
}

export function PartTimeLog({ entries }: { entries: PartTimeEntry[] }) {
  const [draft, setDraft] = useState<PartTimeEntry | null>(null);
  const [pending, startTransition] = useTransition();

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const weekHours = hoursThisWeek(entries);
  const openCount = entries.filter((e) => !e.done).length;

  function save() {
    if (!draft) return;
    const record: PartTimeEntry = {
      ...draft,
      id: draft.id || newId(),
      hours: Number(draft.hours) || 0,
    };
    startTransition(async () => {
      await saveEntry(record);
      setDraft(null);
    });
  }

  function toggleDone(entry: PartTimeEntry) {
    startTransition(() => saveEntry({ ...entry, done: !entry.done }));
  }

  function del() {
    if (!draft?.id) return;
    startTransition(async () => {
      await deleteEntry(draft.id);
      setDraft(null);
    });
  }

  return (
    <>
      <PageHeader
        title="Part-time work"
        eyebrow="Time log"
        subtitle="Log shifts and tasks, keep an eye on weekly hours."
        accent={MODULE["part-time"].color}
        action={
          <Button variant="primary" onClick={() => setDraft(emptyEntry())}>
            <Icons.plus size={16} />
            Log entry
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="eyebrow">Hours this week</p>
          <p className="tnum mt-1.5 text-3xl font-semibold text-parttime">
            {weekHours}
            <span className="ml-0.5 text-base text-text-faint">h</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="eyebrow">Open entries</p>
          <p className="tnum mt-1.5 text-3xl font-semibold text-text">
            {openCount}
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Icons.partTime}
          message="No entries yet. Log your first shift or task."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {sorted.map((entry, i) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover",
                i > 0 && "border-t border-border",
              )}
            >
              <input
                type="checkbox"
                checked={entry.done}
                onChange={() => toggleDone(entry)}
                aria-label={entry.done ? "Mark not done" : "Mark done"}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--parttime)]"
              />
              <button
                onClick={() => setDraft(entry)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium text-text",
                      entry.done && "text-text-muted line-through",
                    )}
                  >
                    {entry.task}
                  </p>
                  {entry.notes ? (
                    <p className="truncate text-xs text-text-faint">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>
                <span className="tnum shrink-0 text-xs text-text-muted">
                  {formatDate(entry.date)}
                </span>
                <span className="tnum w-12 shrink-0 text-right text-sm font-medium text-parttime">
                  {entry.hours}h
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Part-time"
        title={draft?.id ? "Edit entry" : "Log entry"}
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
            <Field label="Task / shift" required>
              <Input
                autoFocus
                required
                value={draft.task}
                onChange={(e) => setDraft({ ...draft, task: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <Input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </Field>
              <Field label="Hours">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={draft.hours}
                  onChange={(e) =>
                    setDraft({ ...draft, hours: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={draft.done}
                onChange={(e) => setDraft({ ...draft, done: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-[var(--parttime)]"
              />
              Mark as done
            </label>

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
