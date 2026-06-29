"use client";

import { useMemo, useState, useRef, useTransition } from "react";
import {
  INVOICE_STATUSES,
  PAYMENT_CHANNELS,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/types";
import {
  INVOICE_STATUS_META,
  PAYMENT_CHANNEL_META,
  channelLabel,
} from "@/lib/meta";
import {
  isOverdue,
  formatMoney,
  incomeTotals,
  DEFAULT_CURRENCY,
} from "@/lib/invoices";
import { newId, todayISO, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea, Select, Segmented } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import {
  saveInvoice,
  deleteInvoice,
  uploadInvoiceFile,
  removeInvoiceFile,
} from "./actions";

type ProjectRef = { id: string; name: string };

const RANK: Record<string, number> = { sent: 0, draft: 1, paid: 2 };

type Filter = InvoiceStatus | "overdue" | "all";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

function emptyInvoice(projectId?: string): Invoice {
  return {
    id: newId(),
    client: "",
    amount: 0,
    currency: DEFAULT_CURRENCY,
    status: "draft",
    issuedDate: todayISO(),
    projectId: projectId || undefined,
  };
}

export function InvoicesPanel({
  invoices,
  projects,
  autoNewProject,
}: {
  invoices: Invoice[];
  projects: ProjectRef[];
  autoNewProject: string | null;
}) {
  const [draft, setDraft] = useState<Invoice | null>(
    autoNewProject !== null ? emptyInvoice(autoNewProject) : null,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [channelFilter, setChannelFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const totals = incomeTotals(invoices);

  const sorted = useMemo(
    () =>
      [...invoices].sort((a, b) => {
        const ra = isOverdue(a) ? -1 : RANK[a.status];
        const rb = isOverdue(b) ? -1 : RANK[b.status];
        if (ra !== rb) return ra - rb;
        return (b.issuedDate ?? "").localeCompare(a.issuedDate ?? "");
      }),
    [invoices],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((inv) => {
      if (filter === "overdue" && !isOverdue(inv)) return false;
      if (filter !== "all" && filter !== "overdue" && inv.status !== filter)
        return false;
      if (channelFilter && inv.channel !== channelFilter) return false;
      if (q) {
        const hay = [
          inv.client,
          inv.title,
          inv.notes,
          inv.channel && channelLabel(inv.channel),
          inv.projectId && projectName[inv.projectId],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, query, filter, channelFilter, projectName]);

  function save() {
    if (!draft) return;
    const record: Invoice = {
      ...draft,
      id: draft.id || newId(),
      amount: Number(draft.amount) || 0,
      channel: draft.channel || undefined,
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

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const res = await uploadInvoiceFile(draft.id, fd);
      if (res) {
        setDraft((d) =>
          d ? { ...d, attachmentPath: res.path, attachmentName: res.name } : d,
        );
      }
    });
    e.target.value = "";
  }
  function removeAttachment() {
    if (!draft?.attachmentPath) return;
    const p = draft.attachmentPath;
    setDraft({ ...draft, attachmentPath: undefined, attachmentName: undefined });
    startUpload(() => removeInvoiceFile(p));
  }

  return (
    <>
      {/* panel actions + quick stats */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted">
          <span className="tnum font-medium text-text">
            {formatMoney(totals.draftExpected)}
          </span>{" "}
          in {totals.draftCount} draft{totals.draftCount === 1 ? "" : "s"}
          {totals.overdueCount > 0 ? (
            <>
              {" · "}
              <span style={{ color: "var(--danger)" }}>
                {totals.overdueCount} overdue
              </span>
            </>
          ) : null}
        </p>
        <Button variant="primary" onClick={() => setDraft(emptyInvoice())}>
          <Icons.plus size={16} />
          New invoice
        </Button>
      </div>

      {/* ---- Search & filter ---- */}
      {sorted.length > 0 ? (
        <div className="mb-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Icons.search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search client, description, channel…"
                className="pl-9"
              />
            </div>
            <div className="w-full shrink-0 sm:w-48">
              <Select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="">All channels</option>
                {PAYMENT_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {PAYMENT_CHANNEL_META[c].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-border-strong bg-surface-active text-text"
                      : "border-border bg-surface text-text-muted hover:bg-surface-hover",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Icons.income}
          message="No invoices yet. Add your first one."
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={Icons.search} message="No invoices match your search." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {visible.map((inv, i) => {
            const over = isOverdue(inv);
            const meta = INVOICE_STATUS_META[inv.status];
            const chLabel = channelLabel(inv.channel);
            const proj = inv.projectId && projectName[inv.projectId];
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
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-text">
                    {inv.client}
                    {inv.recurringId ? (
                      <Icons.recurring size={12} className="shrink-0 text-text-faint" />
                    ) : null}
                    {inv.attachmentPath ? (
                      <Icons.attach size={12} className="shrink-0 text-text-faint" />
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-text-faint">
                    {[inv.title, proj, chLabel].filter(Boolean).join(" · ") || "—"}
                  </p>
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

      {/* ---- Invoice editor ---- */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Invoice"
        title={
          invoices.some((i) => i.id === draft?.id) ? "Edit invoice" : "New invoice"
        }
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
                  onChange={(e) => setDraft({ ...draft, client: e.target.value })}
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
              <Field label="Channel" hint="Where the money lands.">
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
            </div>

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
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                />
              </Field>
            </div>

            {draft.status === "paid" ? (
              <Field label="Paid on" hint="Defaults to today if left blank.">
                <Input
                  type="date"
                  value={draft.paidDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, paidDate: e.target.value })}
                />
              </Field>
            ) : null}

            {/* Invoice file attachment */}
            <div>
              <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
                Invoice file
              </span>
              {draft.attachmentPath ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2">
                  <Icons.attach size={14} className="shrink-0 text-text-faint" />
                  <a
                    href={`/api/files/${draft.attachmentPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-accent hover:underline"
                  >
                    {draft.attachmentName ?? "View file"}
                  </a>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="shrink-0 text-text-faint transition-colors hover:text-danger"
                    aria-label="Remove attachment"
                  >
                    <Icons.close size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={onPickFile}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                  >
                    <Icons.upload size={15} />
                    {uploading ? "Uploading…" : "Upload invoice (PDF/image)"}
                  </Button>
                </>
              )}
            </div>

            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            <ModalActions
              onCancel={() => setDraft(null)}
              onDelete={invoices.some((i) => i.id === draft.id) ? del : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
