import { readCollection } from "@/lib/store";
import { FinanceClient, type FinanceInitial } from "./FinanceClient";

const TABS = ["invoices", "plans", "schedules", "expenses"] as const;

// Resolve the starting tab from the URL — an explicit ?new= wins (so deep-links
// from a project land on the right editor), otherwise ?tab=, else Invoices.
function initialTab(sp: { tab?: string; new?: string }): FinanceInitial["tab"] {
  if (sp.new === "plan") return "plans";
  if (sp.new === "expense") return "expenses";
  if (sp.new === "invoice") return "invoices";
  return (TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as FinanceInitial["tab"])
    : "invoices";
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; new?: string; project?: string }>;
}) {
  const sp = await searchParams;
  const [invoices, schedules, plans, expenses, accounts, projects] =
    await Promise.all([
      readCollection("invoices"),
      readCollection("recurring-invoices"),
      readCollection("payment-plans"),
      readCollection("finance-expenses"),
      readCollection("expense-accounts"),
      readCollection("projects"),
    ]);

  return (
    <FinanceClient
      invoices={invoices}
      schedules={schedules}
      plans={plans}
      expenses={expenses}
      accounts={accounts}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      initial={{
        tab: initialTab(sp),
        newInvoice: sp.new === "invoice",
        newExpense: sp.new === "expense",
        newPlan: sp.new === "plan",
        projectId: sp.project,
      }}
    />
  );
}
