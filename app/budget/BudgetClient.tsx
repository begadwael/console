"use client";

import { useState, useTransition } from "react";
import type { BudgetCategory, Expense } from "@/lib/types";
import { MODULE } from "@/lib/meta";
import { MONTH_NAMES } from "@/lib/calendar";
import {
  monthKey,
  expensesInMonth,
  sumExpenses,
  spentByCategory,
} from "@/lib/budget";
import { formatMoney } from "@/lib/invoices";
import { newId, todayISO, formatDate, parseISO, cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import {
  saveCategory,
  deleteCategory,
  saveExpense,
  deleteExpense,
} from "./actions";

const SWATCHES = [
  "#818cf8",
  "#34d399",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#f5b455",
  "#fb923c",
  "#94a3b8",
];

function emptyExpense(): Expense {
  return { id: "", date: todayISO(), amount: 0 };
}
function emptyCategory(): BudgetCategory {
  return { id: "", name: "", monthlyLimit: 0, color: "#818cf8" };
}

export function BudgetClient({
  categories,
  expenses,
  paidInvoices,
}: {
  categories: BudgetCategory[];
  expenses: Expense[];
  paidInvoices: { amount: number; paidDate: string }[];
}) {
  const today = parseISO(todayISO());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [expenseDraft, setExpenseDraft] = useState<Expense | null>(null);
  const [catDraft, setCatDraft] = useState<BudgetCategory | null>(null);
  const [pending, startTransition] = useTransition();

  const ym = monthKey(year, month);
  const monthExp = expensesInMonth(expenses, ym).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const spent = sumExpenses(monthExp);
  const budgeted = categories.reduce((s, c) => s + c.monthlyLimit, 0);
  const byCat = spentByCategory(monthExp);
  const income = paidInvoices
    .filter((i) => i.paidDate.startsWith(ym))
    .reduce((s, i) => s + i.amount, 0);
  const left = budgeted - spent;
  const net = income - spent;

  const catName = (id?: string) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorized";
  const catColor = (id?: string) =>
    categories.find((c) => c.id === id)?.color ?? "var(--text-faint)";

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function saveExp() {
    if (!expenseDraft) return;
    const record: Expense = {
      ...expenseDraft,
      id: expenseDraft.id || newId(),
      amount: Number(expenseDraft.amount) || 0,
    };
    startTransition(async () => {
      await saveExpense(record);
      setExpenseDraft(null);
    });
  }
  function delExp() {
    if (!expenseDraft?.id) return;
    startTransition(async () => {
      await deleteExpense(expenseDraft.id);
      setExpenseDraft(null);
    });
  }
  function saveCat() {
    if (!catDraft) return;
    const record: BudgetCategory = {
      ...catDraft,
      id: catDraft.id || newId(),
      monthlyLimit: Number(catDraft.monthlyLimit) || 0,
    };
    startTransition(async () => {
      await saveCategory(record);
      setCatDraft(null);
    });
  }
  function delCat() {
    if (!catDraft?.id) return;
    startTransition(async () => {
      await deleteCategory(catDraft.id);
      setCatDraft(null);
    });
  }

  const stats = [
    { label: "Spent", value: formatMoney(spent), color: "var(--budget)" },
    {
      label: left >= 0 ? "Budget left" : "Over budget",
      value: formatMoney(Math.abs(left)),
      color: left >= 0 ? "var(--income)" : "var(--danger)",
    },
    { label: "Income (paid)", value: formatMoney(income), color: "var(--income)" },
    {
      label: "Net",
      value: `${net < 0 ? "−" : ""}${formatMoney(Math.abs(net))}`,
      color: net >= 0 ? "var(--text)" : "var(--danger)",
    },
  ];

  // categories with no monthly limit hits divide-by-zero; guard pct.
  const uncategorized = byCat["__none"] ?? 0;

  return (
    <>
      <PageHeader
        title="Budget"
        eyebrow="Monthly spending"
        subtitle="Track expenses against category budgets and see your net for the month."
        accent={MODULE.budget.color}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                aria-label="Previous month"
                className="rounded-lg border border-border-strong bg-surface p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                <Icons.chevronLeft size={16} />
              </button>
              <span className="tnum w-28 text-center text-sm font-medium text-text">
                {MONTH_NAMES[month].slice(0, 3)} {year}
              </span>
              <button
                onClick={() => shift(1)}
                aria-label="Next month"
                className="rounded-lg border border-border-strong bg-surface p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                <Icons.chevronRight size={16} />
              </button>
            </div>
            <Button variant="primary" onClick={() => setExpenseDraft(emptyExpense())}>
              <Icons.plus size={16} />
              Add expense
            </Button>
          </div>
        }
      />

      {/* Summary */}
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
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Categories */}
        <Card accent={MODULE.budget.color}>
          <CardHeader
            title="Categories"
            subtitle={`${formatMoney(spent)} of ${formatMoney(budgeted)}`}
            icon={<Icons.budget size={15} />}
            accent={MODULE.budget.color}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCatDraft(emptyCategory())}
              >
                <Icons.plus size={14} />
                Category
              </Button>
            }
          />
          <CardBody>
            {categories.length === 0 ? (
              <EmptyState
                icon={Icons.budget}
                message="No categories yet. Add one to set a monthly limit."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {categories.map((c) => {
                  const s = byCat[c.id] ?? 0;
                  const pct =
                    c.monthlyLimit > 0
                      ? Math.min(100, Math.round((s / c.monthlyLimit) * 100))
                      : 0;
                  const over = c.monthlyLimit > 0 && s > c.monthlyLimit;
                  const color = c.color ?? "var(--budget)";
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setCatDraft(c)}
                        className="block w-full text-left"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm text-text">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {c.name}
                          </span>
                          <span className="tnum text-[11px] text-text-muted">
                            {formatMoney(s)}{" "}
                            <span className="text-text-faint">
                              / {formatMoney(c.monthlyLimit)}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${over ? 100 : pct}%`,
                              backgroundColor: over ? "var(--danger)" : color,
                            }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
                {uncategorized > 0 ? (
                  <li className="flex items-center justify-between border-t border-border pt-2 text-sm">
                    <span className="text-text-muted">Uncategorized</span>
                    <span className="tnum text-[11px] text-text-muted">
                      {formatMoney(uncategorized)}
                    </span>
                  </li>
                ) : null}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Expenses */}
        <Card accent={MODULE.budget.color}>
          <CardHeader
            title="Expenses"
            subtitle={`${MONTH_NAMES[month]} · ${monthExp.length}`}
            icon={<Icons.income size={15} />}
            accent={MODULE.budget.color}
          />
          <CardBody>
            {monthExp.length === 0 ? (
              <EmptyState
                icon={Icons.income}
                message="No expenses logged this month."
              />
            ) : (
              <ul className="-mx-2 flex max-h-[22rem] flex-col overflow-y-auto">
                {monthExp.map((e, i) => (
                  <li key={e.id}>
                    <button
                      onClick={() => setExpenseDraft(e)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-hover",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: catColor(e.categoryId) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text">
                          {e.note || catName(e.categoryId)}
                        </p>
                        <p className="truncate text-[11px] text-text-faint">
                          {catName(e.categoryId)}
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-xs text-text-muted">
                        {formatDate(e.date)}
                      </span>
                      <span className="tnum w-20 shrink-0 text-right text-sm font-medium text-text">
                        {formatMoney(e.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Expense modal */}
      <Modal
        open={!!expenseDraft}
        onClose={() => setExpenseDraft(null)}
        eyebrow="Budget"
        title={expenseDraft?.id ? "Edit expense" : "Add expense"}
      >
        {expenseDraft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveExp();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveExp();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" required>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  autoFocus
                  value={expenseDraft.amount}
                  onChange={(e) =>
                    setExpenseDraft({
                      ...expenseDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Date" required>
                <Input
                  type="date"
                  required
                  value={expenseDraft.date}
                  onChange={(e) =>
                    setExpenseDraft({ ...expenseDraft, date: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Category">
              <Select
                value={expenseDraft.categoryId ?? ""}
                onChange={(e) =>
                  setExpenseDraft({
                    ...expenseDraft,
                    categoryId: e.target.value || undefined,
                  })
                }
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note">
              <Textarea
                value={expenseDraft.note ?? ""}
                onChange={(e) =>
                  setExpenseDraft({ ...expenseDraft, note: e.target.value })
                }
              />
            </Field>
            <ModalActions
              onCancel={() => setExpenseDraft(null)}
              onDelete={expenseDraft.id ? delExp : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* Category modal */}
      <Modal
        open={!!catDraft}
        onClose={() => setCatDraft(null)}
        eyebrow="Budget"
        title={catDraft?.id ? "Edit category" : "Add category"}
      >
        {catDraft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (catDraft.name.trim()) saveCat();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" required>
                <Input
                  autoFocus
                  required
                  value={catDraft.name}
                  onChange={(e) =>
                    setCatDraft({ ...catDraft, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Monthly limit" required>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={catDraft.monthlyLimit}
                  onChange={(e) =>
                    setCatDraft({
                      ...catDraft,
                      monthlyLimit: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Colour">
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    onClick={() => setCatDraft({ ...catDraft, color: c })}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      catDraft.color === c ? "border-text" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
            <ModalActions
              onCancel={() => setCatDraft(null)}
              onDelete={catDraft.id ? delCat : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
