"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PAYMENT_CHANNELS,
  type FinanceExpense,
  type ExpenseAccount,
} from "@/lib/types";
import {
  PAYMENT_CHANNEL_META,
  channelLabel,
  accountColor,
} from "@/lib/meta";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/invoices";
import { expenseTotals } from "@/lib/finance";
import { newId, todayISO, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import {
  saveExpense,
  deleteExpense,
  saveAccount,
  deleteAccount,
} from "./actions";

type ProjectRef = { id: string; name: string };

function emptyExpense(projectId?: string): FinanceExpense {
  return {
    id: newId(),
    date: todayISO(),
    amount: 0,
    currency: DEFAULT_CURRENCY,
    projectId: projectId || undefined,
  };
}

export function ExpensesPanel({
  expenses,
  accounts,
  projects,
  autoNewProject,
}: {
  expenses: FinanceExpense[];
  accounts: ExpenseAccount[];
  projects: ProjectRef[];
  autoNewProject: string | null;
}) {
  const [draft, setDraft] = useState<FinanceExpense | null>(
    autoNewProject !== null ? emptyExpense(autoNewProject) : null,
  );
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [pending, startTransition] = useTransition();

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const totals = expenseTotals(expenses);

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [expenses],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((e) => {
      if (accountFilter === "__none__" && e.accountId) return false;
      if (
        accountFilter &&
        accountFilter !== "__none__" &&
        e.accountId !== accountFilter
      )
        return false;
      if (q) {
        const hay = [
          e.vendor,
          e.description,
          e.notes,
          e.accountId && accountMap[e.accountId]?.name,
          e.projectId && projectName[e.projectId],
          e.channel && channelLabel(e.channel),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, query, accountFilter, accountMap, projectName]);

  function save() {
    if (!draft) return;
    const record: FinanceExpense = {
      ...draft,
      id: draft.id || newId(),
      amount: Number(draft.amount) || 0,
      channel: draft.channel || undefined,
    };
    startTransition(async () => {
      await saveExpense(record);
      setDraft(null);
    });
  }
  function del() {
    if (!draft?.id) return;
    startTransition(async () => {
      await deleteExpense(draft.id);
      setDraft(null);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted">
          <span className="tnum font-medium text-text">
            {formatMoney(totals.thisMonth)}
          </span>{" "}
          this month ·{" "}
          <span className="tnum">{formatMoney(totals.thisYear)}</span> this year
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAccountsOpen(true)}>
            <Icons.filter size={15} />
            Accounts
          </Button>
          <Button variant="primary" onClick={() => setDraft(emptyExpense())}>
            <Icons.plus size={16} />
            New expense
          </Button>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Icons.search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor, description, account…"
              className="pl-9"
            />
          </div>
          <div className="w-full shrink-0 sm:w-52">
            <Select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value="__none__">Unfiled</option>
            </Select>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Icons.expense}
          message="No expenses yet. Log your first cost — project or general."
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={Icons.search} message="No expenses match your search." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {visible.map((e, i) => {
            const acct = e.accountId ? accountMap[e.accountId] : undefined;
            const proj = e.projectId && projectName[e.projectId];
            return (
              <button
                key={e.id}
                onClick={() => setDraft(e)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                  i > 0 && "border-t border-border",
                )}
              >
                <span className="tnum hidden w-14 shrink-0 text-[11px] text-text-faint sm:block">
                  {formatDate(e.date)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {e.vendor || e.description || "Expense"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {acct ? (
                      <Badge color={acct.color ?? "var(--text-faint)"} dot>
                        {acct.name}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-text-faint">Unfiled</span>
                    )}
                    {proj ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                        <Icons.projects size={11} />
                        {proj}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="tnum w-24 shrink-0 text-right text-sm font-semibold text-text">
                  {formatMoney(e.amount, e.currency)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Expense editor ---- */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Expense"
        title={
          expenses.some((e) => e.id === draft?.id) ? "Edit expense" : "New expense"
        }
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vendor">
                <Input
                  autoFocus
                  value={draft.vendor ?? ""}
                  placeholder="Who you paid"
                  onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
                />
              </Field>
              <Field label="Date" required>
                <Input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Description">
              <Input
                value={draft.description ?? ""}
                placeholder="e.g. Figma annual plan"
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </Field>

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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Account" hint="General expense bucket.">
                <Select
                  value={draft.accountId ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, accountId: e.target.value || undefined })
                  }
                >
                  <option value="">— Unfiled —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {projects.length > 0 ? (
                <Field label="Project" hint="Counts toward its P&L.">
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

            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            <ModalActions
              onCancel={() => setDraft(null)}
              onDelete={expenses.some((e) => e.id === draft.id) ? del : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>

      <AccountsManager
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        accounts={accounts}
      />
    </>
  );
}

/* ------------------------------------------------------- accounts manager */
function AccountsManager({
  open,
  onClose,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  accounts: ExpenseAccount[];
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    const n = name.trim();
    if (!n) return;
    const record: ExpenseAccount = {
      id: newId(),
      name: n,
      color: accountColor(accounts.length),
    };
    setName("");
    startTransition(() => saveAccount(record));
  }
  function rename(a: ExpenseAccount, next: string) {
    startTransition(() => saveAccount({ ...a, name: next }));
  }
  function del(id: string) {
    startTransition(() => deleteAccount(id));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Finance"
      title="Expense accounts"
    >
      <div className="space-y-3">
        <p className="text-xs text-text-faint">
          Buckets for filing general (non-project) expenses. Deleting one keeps
          its expenses but unfiles them.
        </p>

        <div className="space-y-1.5">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5"
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: a.color ?? "var(--text-faint)" }}
              />
              <input
                defaultValue={a.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== a.name) rename(a, v);
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-text focus:outline-none"
              />
              <button
                type="button"
                onClick={() => del(a.id)}
                disabled={pending}
                className="shrink-0 text-text-faint transition-colors hover:text-danger"
                aria-label={`Delete ${a.name}`}
              >
                <Icons.trash size={14} />
              </button>
            </div>
          ))}
          {accounts.length === 0 ? (
            <p className="text-sm text-text-faint">No accounts yet.</p>
          ) : null}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New account (e.g. Software)"
          />
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            <Icons.plus size={16} />
            Add
          </Button>
        </form>
      </div>
    </Modal>
  );
}
