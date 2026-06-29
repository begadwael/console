"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PAYMENT_CHANNELS,
  type PaymentPlan,
  type PlanInstallment,
  type Invoice,
} from "@/lib/types";
import {
  INVOICE_STATUS_META,
  PAYMENT_CHANNEL_META,
  MODULE,
} from "@/lib/meta";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/invoices";
import { planProgress } from "@/lib/finance";
import { newId, todayISO, formatDate, daysUntil } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { savePlan, deletePlan, generateInstallment } from "./actions";

type ProjectRef = { id: string; name: string };

function emptyInstallment(): PlanInstallment {
  return { id: newId(), label: "", date: todayISO(), amount: 0 };
}

function emptyPlan(projectId?: string): PaymentPlan {
  return {
    id: "",
    name: "",
    client: "",
    currency: DEFAULT_CURRENCY,
    dueDays: 14,
    projectId: projectId || undefined,
    installments: [emptyInstallment()],
    notes: "",
    createdAt: "",
  };
}

export function PlansSection({
  plans,
  projects,
  invoices,
  autoNewProject,
}: {
  plans: PaymentPlan[];
  projects: ProjectRef[];
  invoices: Invoice[];
  autoNewProject: string | null;
}) {
  const [draft, setDraft] = useState<PaymentPlan | null>(
    autoNewProject !== null ? emptyPlan(autoNewProject) : null,
  );
  const [pending, startTransition] = useTransition();

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );
  const invoiceMap = useMemo(
    () => Object.fromEntries(invoices.map((i) => [i.id, i])),
    [invoices],
  );

  function save() {
    if (!draft) return;
    const record: PaymentPlan = {
      ...draft,
      id: draft.id || newId(),
      createdAt: draft.createdAt || new Date().toISOString(),
      currency: draft.currency || DEFAULT_CURRENCY,
      dueDays: Number(draft.dueDays) || 0,
      channel: draft.channel || undefined,
      installments: draft.installments
        .map((i) => ({ ...i, amount: Number(i.amount) || 0 }))
        .filter((i) => i.amount > 0 || i.label),
    };
    startTransition(async () => {
      await savePlan(record);
      setDraft(null);
    });
  }
  function del() {
    if (!draft?.id) return;
    startTransition(async () => {
      await deletePlan(draft.id);
      setDraft(null);
    });
  }
  function generate(planId: string, instId: string) {
    startTransition(() => generateInstallment(planId, instId));
  }

  // ---- installment editor helpers (mutate the draft) ----
  function setInst(id: string, patch: Partial<PlanInstallment>) {
    if (!draft) return;
    setDraft({
      ...draft,
      installments: draft.installments.map((i) =>
        i.id === id ? { ...i, ...patch } : i,
      ),
    });
  }
  function addInst() {
    if (!draft) return;
    setDraft({ ...draft, installments: [...draft.installments, emptyInstallment()] });
  }
  function removeInst(id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      installments: draft.installments.filter((i) => i.id !== id),
    });
  }

  const draftTotal = draft
    ? draft.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    : 0;

  return (
    <>
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.milestone size={14} className="text-text-faint" />
            <h2 className="text-sm font-semibold text-text">Payment plans</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDraft(emptyPlan())}>
            <Icons.plus size={14} />
            New plan
          </Button>
        </div>

        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-text-faint">
            Stage several invoices on their own dates (e.g. 30% on signing, 40% at
            go-live, 30% on delivery). Each installment bills when you generate it.
          </p>
        ) : (
          <div className="grid gap-2">
            {plans.map((plan) => {
              const prog = planProgress(plan);
              const accent = MODULE.finance.color;
              return (
                <div
                  key={plan.id}
                  className="rounded-xl border border-border bg-surface p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setDraft(plan)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-text">
                        {plan.name || "Untitled plan"}
                      </p>
                      <p className="truncate text-xs text-text-faint">
                        {[plan.client, plan.projectId && projectName[plan.projectId]]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </button>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-sm font-semibold text-text">
                        {formatMoney(prog.billed, plan.currency)}
                        <span className="text-text-faint">
                          {" "}
                          / {formatMoney(prog.total, plan.currency)}
                        </span>
                      </p>
                      <p className="text-[11px] text-text-faint">
                        {prog.billedCount} of {prog.count} billed
                        {prog.dueNow > 0 ? (
                          <span style={{ color: "var(--warning)" }}>
                            {" · "}
                            {prog.dueNow} due
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${prog.pct}%`, backgroundColor: accent }}
                    />
                  </div>

                  {/* installments */}
                  <div className="mt-2.5 divide-y divide-border rounded-lg border border-border">
                    {[...plan.installments]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((inst) => {
                        const inv = inst.invoiceId
                          ? invoiceMap[inst.invoiceId]
                          : undefined;
                        const due = !inst.invoiceId && daysUntil(inst.date) <= 0;
                        return (
                          <div
                            key={inst.id}
                            className="flex items-center gap-2 px-2.5 py-1.5"
                          >
                            <span className="tnum w-12 shrink-0 text-[11px] text-text-faint">
                              {formatDate(inst.date)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                              {inst.label || "Installment"}
                            </span>
                            <span className="tnum shrink-0 text-xs font-medium text-text">
                              {formatMoney(inst.amount, plan.currency)}
                            </span>
                            {inst.invoiceId ? (
                              inv ? (
                                <Badge color={INVOICE_STATUS_META[inv.status].color} dot>
                                  {INVOICE_STATUS_META[inv.status].label}
                                </Badge>
                              ) : (
                                <Badge color="var(--text-faint)" dot>
                                  Billed
                                </Badge>
                              )
                            ) : (
                              <Button
                                variant={due ? "primary" : "secondary"}
                                size="sm"
                                disabled={pending}
                                onClick={() => generate(plan.id, inst.id)}
                              >
                                <Icons.bolt size={13} />
                                Bill
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Plan editor ---- */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Payment plan"
        title={plans.some((p) => p.id === draft?.id) ? "Edit plan" : "New plan"}
      >
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.name.trim() && draft.client.trim()) save();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plan name" required>
                <Input
                  autoFocus
                  required
                  value={draft.name}
                  placeholder="e.g. EduCom build"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Client" required>
                <Input
                  required
                  value={draft.client}
                  onChange={(e) => setDraft({ ...draft, client: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {projects.length > 0 ? (
                <Field label="Project">
                  <Select
                    value={draft.projectId ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, projectId: e.target.value || undefined })
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
              <Field label="Currency">
                <Input
                  value={draft.currency ?? DEFAULT_CURRENCY}
                  onChange={(e) =>
                    setDraft({ ...draft, currency: e.target.value.toUpperCase() })
                  }
                />
              </Field>
              <Field label="Terms" hint="Days to pay.">
                <Input
                  type="number"
                  min={0}
                  value={draft.dueDays ?? 14}
                  onChange={(e) =>
                    setDraft({ ...draft, dueDays: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <Field label="Channel">
              <Select
                value={draft.channel ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, channel: e.target.value || undefined })
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

            {/* Installments editor */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted">
                  Installments
                </span>
                <span className="tnum text-[11px] text-text-faint">
                  Total {formatMoney(draftTotal, draft.currency)}
                </span>
              </div>
              <div className="space-y-1.5">
                {draft.installments.map((inst) => {
                  const billed = !!inst.invoiceId;
                  return (
                    <div key={inst.id} className="flex items-center gap-1.5">
                      <Input
                        value={inst.label ?? ""}
                        placeholder="Label"
                        className="flex-1"
                        onChange={(e) => setInst(inst.id, { label: e.target.value })}
                      />
                      <Input
                        type="date"
                        value={inst.date}
                        className="w-[9.5rem]"
                        onChange={(e) => setInst(inst.id, { date: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={inst.amount}
                        placeholder="Amount"
                        className="w-28"
                        onChange={(e) =>
                          setInst(inst.id, { amount: Number(e.target.value) })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeInst(inst.id)}
                        disabled={billed || draft.installments.length === 1}
                        className="shrink-0 p-1.5 text-text-faint transition-colors hover:text-danger disabled:opacity-30"
                        aria-label="Remove installment"
                        title={billed ? "Already billed" : "Remove"}
                      >
                        <Icons.trash size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addInst}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Icons.plus size={12} /> Add installment
              </button>
            </div>

            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            {plans.some((p) => p.id === draft.id) ? (
              <p className="text-[11px] text-text-faint">
                Bill installments from the plan card. Issued installments can&apos;t
                be removed here.
              </p>
            ) : null}

            <ModalActions
              onCancel={() => setDraft(null)}
              onDelete={plans.some((p) => p.id === draft.id) ? del : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
