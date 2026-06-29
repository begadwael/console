import type { Invoice, InvoiceCadence, RecurringInvoice } from "./types";
import { addDays, daysUntil, parseISO, toISO, todayISO, newId } from "./utils";

// Currency for all money in the app.
export const DEFAULT_CURRENCY = "USD";

// A sent invoice past its due date is overdue (a derived state, not stored).
export function isOverdue(inv: Invoice): boolean {
  return inv.status === "sent" && !!inv.dueDate && daysUntil(inv.dueDate) < 0;
}

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export interface IncomeTotals {
  draftExpected: number; // sum of draft invoices — billed soon, not yet sent
  draftCount: number;
  outstanding: number; // sent, not yet paid
  overdue: number;
  overdueCount: number;
  paidThisMonth: number;
  paidThisYear: number;
}

export function incomeTotals(invoices: Invoice[]): IncomeTotals {
  const now = todayISO();
  const ym = now.slice(0, 7);
  const yr = now.slice(0, 4);
  const t: IncomeTotals = {
    draftExpected: 0,
    draftCount: 0,
    outstanding: 0,
    overdue: 0,
    overdueCount: 0,
    paidThisMonth: 0,
    paidThisYear: 0,
  };
  for (const inv of invoices) {
    if (inv.status === "draft") {
      t.draftExpected += inv.amount;
      t.draftCount += 1;
    }
    if (inv.status === "sent") {
      t.outstanding += inv.amount;
      if (isOverdue(inv)) {
        t.overdue += inv.amount;
        t.overdueCount += 1;
      }
    }
    if (inv.status === "paid" && inv.paidDate) {
      if (inv.paidDate.startsWith(yr)) t.paidThisYear += inv.amount;
      if (inv.paidDate.startsWith(ym)) t.paidThisMonth += inv.amount;
    }
  }
  return t;
}

// ---- Recurring schedules ----

// Advance an ISO date by one cadence step. Months/quarters/years use calendar
// math (clamped to the last valid day) so a "monthly" bill keeps its day number.
export function advanceDate(iso: string, cadence: InvoiceCadence): string {
  if (cadence === "weekly") return addDays(iso, 7);
  const d = parseISO(iso);
  const day = d.getDate();
  const addMonths = cadence === "monthly" ? 1 : cadence === "quarterly" ? 3 : 12;
  d.setDate(1); // avoid month-end rollover while shifting
  d.setMonth(d.getMonth() + addMonths);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISO(d);
}

// A schedule is "due" when it's active and its next issue date has arrived.
export function isScheduleDue(s: RecurringInvoice): boolean {
  return s.active && daysUntil(s.nextDate) <= 0;
}

// Normalize a schedule's amount to an approximate monthly figure, so several
// cadences can be summed into one "expected per month" number.
export function monthlyValue(s: RecurringInvoice): number {
  if (!s.active) return 0;
  switch (s.cadence) {
    case "weekly":
      return (s.amount * 52) / 12;
    case "monthly":
      return s.amount;
    case "quarterly":
      return s.amount / 3;
    case "yearly":
      return s.amount / 12;
  }
}

export function recurringMonthly(schedules: RecurringInvoice[]): number {
  return schedules.reduce((sum, s) => sum + monthlyValue(s), 0);
}

// Build a fresh draft invoice from a schedule, issued on `issue` (default: the
// schedule's nextDate). Does not advance the schedule — the caller does that.
export function materializeInvoice(
  s: RecurringInvoice,
  issue = s.nextDate,
): Invoice {
  return {
    id: newId(),
    client: s.client,
    title: s.title,
    projectId: s.projectId,
    amount: s.amount,
    currency: s.currency,
    channel: s.channel,
    status: "draft",
    issuedDate: issue,
    dueDate: addDays(issue, s.dueDays ?? 14),
    notes: s.notes,
    recurringId: s.id,
  };
}
