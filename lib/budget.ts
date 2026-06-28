import type { Expense } from "./types";

// "YYYY-MM" key for a given year + 0-based month.
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function expensesInMonth(expenses: Expense[], ym: string): Expense[] {
  return expenses.filter((e) => e.date.startsWith(ym));
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

// categoryId (or "__none") -> total spent.
export function spentByCategory(expenses: Expense[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.categoryId ?? "__none";
    map[key] = (map[key] ?? 0) + (Number(e.amount) || 0);
  }
  return map;
}
