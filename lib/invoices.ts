import type { Invoice } from "./types";
import { daysUntil, todayISO } from "./utils";

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
    outstanding: 0,
    overdue: 0,
    overdueCount: 0,
    paidThisMonth: 0,
    paidThisYear: 0,
  };
  for (const inv of invoices) {
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
