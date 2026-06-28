"use client";

import { useState, useTransition } from "react";
import { INVOICE_STATUSES, type Invoice } from "@/lib/types";
import { INVOICE_STATUS_META, MODULE } from "@/lib/meta";
import {
  isOverdue,
  formatMoney,
  incomeTotals,
  DEFAULT_CURRENCY,
} from "@/lib/invoices";
import { newId, todayISO, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea, Select, Segmented } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { saveInvoice, deleteInvoice } from "./actions";

const RANK: Record<string, number> = { sent: 0, draft: 1, paid: 2 };

function emptyInvoice(): Invoice {
  return {
    id: "",
    client: "",
    amount: 0,
    currency: DEFAULT_CURRENCY,
    status: "draft",
    issuedDate: todayISO(),
  };
}

export function IncomeClient({
  invoices,
  projects,
}: {
  invoices: Invoice[];
  projects: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<Invoice | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = incomeTotals(invoices);
  const sorted = [...invoices].sort((a, b) => {
    const ra = isOverdue(a) ? -1 : RANK[a.status];
    const rb = isOverdue(b) ? -1 : RANK[b.status];
    if (ra !== rb) return ra - rb;
    return (b.issuedDate ?? "").localeCompare(a.issuedDate ?? "");
  });

  function save() {
    if (!draft) return;
    const record: Invoice = {
      ...draft,
      id: draft.id || newId(),
      amount: Number(draft.amount) || 0,
      paidDate:
        draft.status === "paid" ? (draft.paidDate ?? todayISO()) : undefined,
    };
    startTransition(async () => {
      await saveInvoice(record);
      setDraft(null);
    });
  }
  function del() {
    if (!draft?.id) return;
    startTransition(async () => {
      await deleteInvoice(draft.id);
      setDraft(null);
    });
  }

  const stats = [
    {
      label: "Outstanding",
      value: formatMoney(totals.outstanding),
      hint: "sent, unpaid",
      color: "var(--income)",
    },
    {
      label: "Overdue",
      value: formatMoney(totals.overdue),
      hint: `${totals.overdueCount} invoice${totals.overdueCount === 1 ? "" : "s"}`,
      color: "var(--danger)",
    },
    {
      label: "Paid this month",
      value: formatMoney(totals.paidThisMonth),
      hint: "received",
      color: "var(--text)",
    },
    {
      label: "Paid this year",
      value: formatMoney(totals.paidThisYear),
      hint: "received",
      color: "var(--text)",
    },
  ];

  return (
    <>
      <PageHeader
        title="Income"
        eyebrow="Invoices & earnings"
        subtitle="Track what you've billed and what you're owed across Side work and part-time."
        accent={MODULE.income.color}
        action={
          <Button variant="primary" onClick={() => setDraft(emptyInvoice())}>
            <Icons.plus size={16} />
            New invoice
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <p className="eyebrow">{s.label}</p>
            <p
              className="tnum mt-2 text-2xl font-semibold"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] text-text-faint">{s.hint}</p>
          </div>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Icons.income}
          message="No invoices yet. Add your first one."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {sorted.map((inv, i) => {
            const over = isOverdue(inv);
            const meta = INVOICE_STATUS_META[inv.status];
            return (
              <button
                key={inv.id}
                onClick={() => setDraft(inv)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                  i > 0 && "border-t border-border",
                )}
              >
                <Badge color={over ? "var(--danger)" : meta.color} dot>
                  {over ? "Overdue" : meta.label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {inv.client}
                  </p>
                  {inv.title ? (
                    <p className="truncate text-xs text-text-faint">
                      {inv.title}
                    </p>
                  ) : null}
                </div>
                {inv.dueDate && inv.status !== "paid" ? (
                  <span
                    className="tnum hidden shrink-0 text-[11px] sm:block"
                    style={{ color: over ? "var(--danger)" : "var(--text-faint)" }}
                  >
                    due {formatDate(inv.dueDate)}
                  </span>
                ) : null}
                <span className="tnum w-24 shrink-0 text-right text-sm font-semibold text-text">
                  {formatMoney(inv.amount, inv.currency)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Income"
        title={draft?.id ? "Edit invoice" : "New invoice"}
      >
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.client.trim()) save();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client" required>
                <Input
                  autoFocus
                  required
                  value={draft.client}
                  onChange={(e) =>
                    setDraft({ ...draft, client: e.target.value })
                  }
                />
              </Field>
              <Field label="Description">
                <Input
                  value={draft.title ?? ""}
                  placeholder="e.g. June retainer"
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
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
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={draft.currency ?? DEFAULT_CURRENCY}
                  onChange={(e) =>
                    setDraft({ ...draft, currency: e.target.value.toUpperCase() })
                  }
                />
              </Field>
            </div>

            <Field label="Status">
              <Segmented
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                options={INVOICE_STATUSES.map((s) => ({
                  value: s,
                  label: INVOICE_STATUS_META[s].label,
                  color: INVOICE_STATUS_META[s].color,
                }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Issued">
                <Input
                  type="date"
                  value={draft.issuedDate ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, issuedDate: e.target.value })
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

            {draft.status === "paid" ? (
              <Field label="Paid on" hint="Defaults to today if left blank.">
                <Input
                  type="date"
                  value={draft.paidDate ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, paidDate: e.target.value })
                  }
                />
              </Field>
            ) : null}

            {projects.length > 0 ? (
              <Field label="Project">
                <Select
                  value={draft.projectId ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      projectId: e.target.value || undefined,
                    })
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
