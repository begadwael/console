"use client";

import { useState, useTransition } from "react";
import {
  PERSONAL_TYPES,
  type PersonalItem,
  type PersonalType,
} from "@/lib/types";
import { PERSONAL_TYPE_META, MODULE } from "@/lib/meta";
import { newId, todayISO, daysUntil, cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea, Segmented } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { saveItem, deleteItem } from "./actions";

const TYPE_ICON = {
  habit: Icons.habit,
  goal: Icons.target,
  todo: Icons.todo,
} as const;

function emptyItem(type: PersonalType = "habit"): PersonalItem {
  return { id: "", type, title: "", streak: 0 };
}

function toggleHabitToday(item: PersonalItem): PersonalItem {
  const today = todayISO();
  if (item.lastDone === today) {
    return {
      ...item,
      lastDone: undefined,
      streak: Math.max(0, (item.streak ?? 1) - 1),
    };
  }
  const continued = item.lastDone && daysUntil(item.lastDone) === -1;
  return {
    ...item,
    lastDone: today,
    streak: continued ? (item.streak ?? 0) + 1 : 1,
  };
}

export function PersonalView({ items }: { items: PersonalItem[] }) {
  const [draft, setDraft] = useState<PersonalItem | null>(null);
  const [pending, startTransition] = useTransition();

  const habits = items.filter((i) => i.type === "habit");
  const others = items.filter((i) => i.type !== "habit");

  function save() {
    if (!draft) return;
    const record: PersonalItem = { ...draft, id: draft.id || newId() };
    startTransition(async () => {
      await saveItem(record);
      setDraft(null);
    });
  }

  function persist(item: PersonalItem) {
    startTransition(() => saveItem(item));
  }

  function del() {
    if (!draft?.id) return;
    startTransition(async () => {
      await deleteItem(draft.id);
      setDraft(null);
    });
  }

  return (
    <>
      <PageHeader
        title="Personal & habits"
        eyebrow="Off the clock"
        subtitle="Habits, goals, and the small to-dos that fall through the cracks."
        accent={MODULE.personal.color}
        action={
          <Button variant="primary" onClick={() => setDraft(emptyItem())}>
            <Icons.plus size={16} />
            Add
          </Button>
        }
      />

      <section className="mb-8">
        <p className="eyebrow mb-3">Habits</p>
        {habits.length === 0 ? (
          <EmptyState icon={Icons.habit} message="No habits tracked yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {habits.map((habit) => {
              const doneToday = habit.lastDone === todayISO();
              return (
                <Card key={habit.id} className="p-4" accent="var(--personal)">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setDraft(habit)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate font-medium text-text">
                        {habit.title}
                      </p>
                      {habit.cadence ? (
                        <p className="text-xs text-text-muted">
                          {habit.cadence}
                        </p>
                      ) : null}
                    </button>
                    <span className="flex shrink-0 items-center gap-1 text-personal">
                      <Icons.flame size={15} />
                      <span className="tnum text-lg font-semibold">
                        {habit.streak ?? 0}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => persist(toggleHabitToday(habit))}
                    className={cn(
                      "mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition-colors",
                      doneToday
                        ? "border-transparent bg-personal/15 text-personal"
                        : "border-border-strong text-text-muted hover:bg-surface-hover hover:text-text",
                    )}
                  >
                    {doneToday ? <Icons.check size={14} /> : null}
                    {doneToday ? "Done today" : "Mark done today"}
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-3">Goals &amp; to-dos</p>
        {others.length === 0 ? (
          <EmptyState icon={Icons.target} message="Nothing here yet." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {others.map((item, i) => {
              const meta = PERSONAL_TYPE_META[item.type];
              const Icon = TYPE_ICON[item.type];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!item.done}
                    onChange={() => persist({ ...item, done: !item.done })}
                    aria-label={item.done ? "Mark not done" : "Mark done"}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--personal)]"
                  />
                  <button
                    onClick={() => setDraft(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium text-text",
                          item.done && "text-text-muted line-through",
                        )}
                      >
                        {item.title}
                      </p>
                      {item.cadence ? (
                        <p className="truncate text-xs text-text-faint">
                          {item.cadence}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="flex shrink-0 items-center gap-1.5 text-xs"
                      style={{ color: meta.color }}
                    >
                      <Icon size={13} />
                      {meta.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Personal"
        title={draft?.id ? "Edit item" : "Add item"}
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
            <Field label="Type">
              <Segmented
                value={draft.type}
                onChange={(type) => setDraft({ ...draft, type })}
                options={PERSONAL_TYPES.map((t) => ({
                  value: t,
                  label: PERSONAL_TYPE_META[t].label,
                  color: PERSONAL_TYPE_META[t].color,
                }))}
              />
            </Field>

            <Field label="Title" required>
              <Input
                autoFocus
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cadence / timeframe">
                <Input
                  placeholder="daily, this month…"
                  value={draft.cadence ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, cadence: e.target.value })
                  }
                />
              </Field>
              {draft.type === "habit" ? (
                <Field label="Current streak">
                  <Input
                    type="number"
                    min={0}
                    value={draft.streak ?? 0}
                    onChange={(e) =>
                      setDraft({ ...draft, streak: Number(e.target.value) })
                    }
                  />
                </Field>
              ) : null}
            </div>

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
