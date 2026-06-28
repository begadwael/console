import { readCollection } from "@/lib/store";
import { BudgetClient } from "./BudgetClient";

export default async function BudgetPage() {
  const [categories, expenses, invoices] = await Promise.all([
    readCollection("budget-categories"),
    readCollection("expenses"),
    readCollection("invoices"),
  ]);
  // Income reference = paid invoices, by month.
  const paidInvoices = invoices
    .filter((i) => i.status === "paid" && i.paidDate)
    .map((i) => ({ amount: i.amount, paidDate: i.paidDate as string }));
  return (
    <BudgetClient
      categories={categories}
      expenses={expenses}
      paidInvoices={paidInvoices}
    />
  );
}
