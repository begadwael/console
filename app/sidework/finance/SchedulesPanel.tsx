"use client";

import { useMemo, useState, useTransition } from "react";
import {
  INVOICE_CADENCES,
  PAYMENT_CHANNELS,
  type RecurringInvoice,
} from "@/lib/types";
import {
  INVOICE_CADENCE_META,
  PAYMENT_CHANNEL_META,
  MODULE,
} from "@/lib/meta";
import {
  isScheduleDue,
  formatMoney,
  recurringMonthly,
  DEFAULT_CURRENCY,
} from "@/lib/invoices";
import { newId, todayISO, formatDate, dueLabel, daysUntil, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea, Select, Segmented } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { saveSchedule, deleteSchedule, generateFromSchedule } from "./actions";

type ProjectRef = { id: string; name: string };

function emptySchedule(): RecurringInvoice {
  return {
    id: "",
    client: "",
    amount: 0,
    currency: DEFAULT_CURRENCY,
    cadence: "monthly",
    nextDate: todayISO(),
    dueDays: 14,
    active: true,
  };
}

export function SchedulesPanel({
  schedules,
  projects,
}: {
  schedules: RecurringInvoice[];
  projects: ProjectRef[];
}) {
  const [sched, setSched] = useState<RecurringInvoice | null>(null);
  const [pending, startTransition] = useTransition();

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const monthly = recurringMonthly(schedules);
  const dueCount = schedules.filter(isScheduleDue).length;

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort((a, b) => {
        const da = isScheduleDue(a) ? -1 : a.active ? 0 : 1;
        const db = isScheduleDue(b) ? -1 : b.active ? 0 : 1;
        if (da !== db) return da - db;
        return a.nextDate.localeCompare(b.nextDate);
      }),
    [schedules],
  );

  function saveSched() {
    if (!sched) return;
    const record: RecurringInvoice = {
      ...sched,
      id: sched.id || newId(),
      amount: Number(sched.amount) || 0,
      dueDays: Number(sched.dueDays) || 0,
      channel: sched.channel || undefined,
    };
    startTransition(async () => {
      await saveSchedule(record);
      setSched(null);
    });
  }
  function delSched() {
    if (!sched?.id) return;
    startTransition(async () => {
      await deleteSchedule(sched.id);
      setSched(null);
    });
  }
  function generate(id: string) {
    startTransition(() => generateFromSchedule(id));
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted">
          {schedules.length > 0 ? (
            <>
              <span className="tnum font-medium text-text">
                ≈ {formatMoney(monthly)}
              </span>{" "}
              per month
              {dueCount > 0 ? (
                <>
                  {" · "}
                  <span style={{ color: "var(--warning)" }}>
                    {dueCount} due to bill
                  </span>
                </>
              ) : null}
            </>
          ) : (
            "Recurring retainers on a fixed cadence."
          )}
        </p>
        <Button variant="primary" onClick={() => setSched(emptySchedule())}>
          <Icons.plus size={16} />
          New schedule
        </Button>
      </div>

      {sortedSchedules.length === 0 ? (
        <EmptyState
          icon={Icons.recurring}
          message="No schedules yet. Add a recurring retainer (weekly → yearly)."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {sortedSchedules.map((s) => {
            const due = isScheduleDue(s);
            const cad = INVOICE_CADENCE_META[s.cadence];
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-xl border bg-surface p-3",
                  due ? "border-border-strong" : "border-border",
                  !s.active && "opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setSched(s)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">
                        {s.client}
                      </p>
                      <Badge color={MODULE.finance.color} dot>
                        {cad.label}
                      </Badge>
                      {!s.active ? (
                        <span className="text-[10px] uppercase tracking-wide text-text-faint">
                          Paused
                        </span>
                      ) : null}
                    </div>
                    {s.title ? (
                      <p className="truncate text-xs text-text-faint">
                        {s.title}
                        {s.projectId && projectName[s.projectId]
                          ? ` · ${projectName[s.projectId]}`
                          : ""}
                      </p>
                    ) : null}
                    <p className="tnum mt-1 text-xs text-text-muted">
                      {formatMoney(s.amount, s.currency)} ·{" "}
                      <span
                        style={{
                          color: due ? "var(--warning)" : "var(--text-faint)",
                        }}
                      >
                        {s.active
                          ? `next ${formatDate(s.nextDate)} (${dueLabel(s.nextDate)})`
                          : "paused"}
                      </span>
                    </p>
                  </button>
                  <Button
                    variant={due ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => generate(s.id)}
                    disabled={pending || !s.active}
                    className="shrink-0"
                  >
                    <Icons.bolt size={14} />
                    Generate
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Recurring schedule editor ---- */}
      <Modal
        open={!!sched}
        onClose={() => setSched(null)}
        eyebrow="Recurring invoice"
        title={sched?.id ? "Edit schedule" : "New schedule"}
      >
        {sched ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (sched.client.trim()) saveSched();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveSched();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client" required>
                <Input
                  autoFocus
                  required
                  value={sched.client}
                  onChange={(e) => setSched({ ...sched, client: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <Input
                  value={sched.title ?? ""}
                  placeholder="e.g. Monthly retainer"
                  onChange={(e) => setSched({ ...sched, title: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" required>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={sched.amount}
                  onChange={(e) =>
                    setSched({ ...sched, amount: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={sched.currency ?? DEFAULT_CURRENCY}
                  onChange={(e) =>
                    setSched({ ...sched, currency: e.target.value.toUpperCase() })
                  }
                />
              </Field>
            </div>

            <Field label="Cadence">
              <Segmented
                value={sched.cadence}
                onChange={(cadence) => setSched({ ...sched, cadence })}
                options={INVOICE_CADENCES.map((c) => ({
                  value: c,
                  label: INVOICE_CADENCE_META[c].label,
                }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Next issue date" required>
                <Input
                  type="date"
                  required
                  value={sched.nextDate}
                  onChange={(e) => setSched({ ...sched, nextDate: e.target.value })}
                />
              </Field>
              <Field label="Payment terms" hint="Days until due.">
                <Input
                  type="number"
                  min={0}
                  value={sched.dueDays ?? 14}
                  onChange={(e) =>
                    setSched({ ...sched, dueDays: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel">
                <Select
                  value={sched.channel ?? ""}
                  onChange={(e) =>
                    setSched({ ...sched, channel: e.target.value || undefined })
                  }
                >
                  <option value="">— None —</option>
                  {PAYMENT_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {PAYMENT_CHANNEL_META[c].label}
                    </option>
                  ))}
                </Select>
              </Field>
              {projects.length > 0 ? (
                <Field label="Project">
                  <Select
                    value={sched.projectId ?? ""}
                    onChange={(e) =>
                      setSched({ ...sched, projectId: e.target.value || undefined })
                    }
                  >
                    <option value="">— None —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={sched.active}
                onChange={(e) => setSched({ ...sched, active: e.target.checked })}
                className="size-4 accent-[var(--income)]"
              />
              Active — surface this schedule when it&apos;s due to bill
            </label>

            <Field label="Notes">
              <Textarea
                value={sched.notes ?? ""}
                onChange={(e) => setSched({ ...sched, notes: e.target.value })}
              />
            </Field>

            {sched.id && sched.active ? (
              <div className="rounded-lg border border-border bg-bg-elevated p-3 text-xs text-text-muted">
                Next invoice issues{" "}
                <span className="font-medium text-text">
                  {formatDate(sched.nextDate)}
                </span>{" "}
                ({dueLabel(sched.nextDate)}).{" "}
                {daysUntil(sched.nextDate) <= 0
                  ? "Ready to generate now."
                  : "Use “Generate” on the card to bill early."}
              </div>
            ) : null}

            <ModalActions
              onCancel={() => setSched(null)}
              onDelete={sched.id ? delSched : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
