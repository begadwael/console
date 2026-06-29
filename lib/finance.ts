import type {
  Invoice,
  FinanceExpense,
  PaymentPlan,
  PlanInstallment,
} from "./types";
import { addDays, daysUntil, newId, todayISO } from "./utils";

// Sum a list of money amounts (small helper to keep call sites readable).
function sum<T>(items: T[], pick: (i: T) => number): number {
  return items.reduce((acc, i) => acc + pick(i), 0);
}

export interface ExpenseTotals {
  total: number; // all expenses
  thisMonth: number;
  thisYear: number;
  count: number;
}

export function expenseTotals(expenses: FinanceExpense[]): ExpenseTotals {
  const now = todayISO();
  const ym = now.slice(0, 7);
  const yr = now.slice(0, 4);
  const t: ExpenseTotals = { total: 0, thisMonth: 0, thisYear: 0, count: 0 };
  for (const e of expenses) {
    t.total += e.amount;
    t.count += 1;
    if (e.date.startsWith(yr)) t.thisYear += e.amount;
    if (e.date.startsWith(ym)) t.thisMonth += e.amount;
  }
  return t;
}

// Spend grouped by account id (undefined account → "" bucket = uncategorized).
export function expensesByAccount(
  expenses: FinanceExpense[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.accountId ?? "";
    out[key] = (out[key] ?? 0) + e.amount;
  }
  return out;
}

export interface ProjectPnl {
  received: number; // paid invoices
  outstanding: number; // sent, not yet paid
  drafted: number; // draft invoices (not yet sent)
  billed: number; // received + outstanding (everything sent or paid)
  expenses: number; // linked expenses
  net: number; // received − expenses (realized profit)
  invoiceCount: number;
  expenseCount: number;
}

// Profit/loss for a single project. `net` is realized (received − expenses);
// outstanding and drafted are surfaced separately so unpaid work isn't counted
// as profit.
export function projectPnl(
  projectId: string,
  invoices: Invoice[],
  expenses: FinanceExpense[],
): ProjectPnl {
  const inv = invoices.filter((i) => i.projectId === projectId);
  const exp = expenses.filter((e) => e.projectId === projectId);
  const received = sum(
    inv.filter((i) => i.status === "paid"),
    (i) => i.amount,
  );
  const outstanding = sum(
    inv.filter((i) => i.status === "sent"),
    (i) => i.amount,
  );
  const drafted = sum(
    inv.filter((i) => i.status === "draft"),
    (i) => i.amount,
  );
  const expensesTotal = sum(exp, (e) => e.amount);
  return {
    received,
    outstanding,
    drafted,
    billed: received + outstanding,
    expenses: expensesTotal,
    net: received - expensesTotal,
    invoiceCount: inv.length,
    expenseCount: exp.length,
  };
}

export interface FinanceSummary {
  received: number; // all paid invoices
  outstanding: number; // all sent, unpaid
  expenses: number; // all expenses
  net: number; // received − expenses (overall realized profit)
}

export function financeSummary(
  invoices: Invoice[],
  expenses: FinanceExpense[],
): FinanceSummary {
  const received = sum(
    invoices.filter((i) => i.status === "paid"),
    (i) => i.amount,
  );
  const outstanding = sum(
    invoices.filter((i) => i.status === "sent"),
    (i) => i.amount,
  );
  const exp = sum(expenses, (e) => e.amount);
  return { received, outstanding, expenses: exp, net: received - exp };
}

// ---- Payment plans ----

export interface PlanProgress {
  count: number; // total installments
  billedCount: number; // installments already issued as invoices
  total: number; // sum of all installment amounts (the plan's value)
  billed: number; // sum of issued installment amounts
  remaining: number; // total − billed
  pct: number; // billed / total, 0–100
  nextDue?: PlanInstallment; // earliest unbilled installment
  dueNow: number; // count of unbilled installments whose date has arrived
}

export function planProgress(plan: PaymentPlan): PlanProgress {
  const count = plan.installments.length;
  const total = sum(plan.installments, (i) => i.amount);
  const issued = plan.installments.filter((i) => i.invoiceId);
  const billed = sum(issued, (i) => i.amount);
  const unbilled = plan.installments
    .filter((i) => !i.invoiceId)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    count,
    billedCount: issued.length,
    total,
    billed,
    remaining: total - billed,
    pct: total > 0 ? Math.round((billed / total) * 100) : 0,
    nextDue: unbilled[0],
    dueNow: unbilled.filter((i) => daysUntil(i.date) <= 0).length,
  };
}

// Build a draft invoice from a plan installment. Issued on the installment's
// scheduled date; due = issue + the plan's terms.
export function installmentToInvoice(
  plan: PaymentPlan,
  inst: PlanInstallment,
): Invoice {
  return {
    id: newId(),
    client: plan.client,
    title: [plan.name, inst.label].filter(Boolean).join(" · "),
    projectId: plan.projectId,
    amount: inst.amount,
    currency: plan.currency,
    channel: plan.channel,
    status: "draft",
    issuedDate: inst.date,
    dueDate: addDays(inst.date, plan.dueDays ?? 14),
  };
}
