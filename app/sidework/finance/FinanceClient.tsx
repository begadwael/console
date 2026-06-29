"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  Invoice,
  RecurringInvoice,
  PaymentPlan,
  FinanceExpense,
  ExpenseAccount,
} from "@/lib/types";
import { MODULE } from "@/lib/meta";
import { financeSummary } from "@/lib/finance";
import { formatMoney } from "@/lib/invoices";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { InvoicesPanel } from "./InvoicesPanel";
import { SchedulesPanel } from "./SchedulesPanel";
import { PlansSection } from "./PlansSection";
import { ExpensesPanel } from "./ExpensesPanel";

type ProjectRef = { id: string; name: string };
type Tab = "invoices" | "plans" | "schedules" | "expenses";

export interface FinanceInitial {
  tab: Tab;
  newInvoice?: boolean;
  newExpense?: boolean;
  newPlan?: boolean;
  projectId?: string;
}

export function FinanceClient({
  invoices,
  schedules,
  plans,
  expenses,
  accounts,
  projects,
  initial,
}: {
  invoices: Invoice[];
  schedules: RecurringInvoice[];
  plans: PaymentPlan[];
  expenses: FinanceExpense[];
  accounts: ExpenseAccount[];
  projects: ProjectRef[];
  initial: FinanceInitial;
}) {
  const [tab, setTab] = useState<Tab>(initial.tab);

  const summary = financeSummary(invoices, expenses);
  const cards = [
    {
      label: "Net profit",
      value: formatMoney(summary.net),
      hint: "received − expenses",
      color: summary.net < 0 ? "var(--danger)" : "var(--income)",
    },
    {
      label: "Received",
      value: formatMoney(summary.received),
      hint: "invoices paid",
      color: "var(--text)",
    },
    {
      label: "Outstanding",
      value: formatMoney(summary.outstanding),
      hint: "sent, unpaid",
      color: "var(--text)",
    },
    {
      label: "Expenses",
      value: formatMoney(summary.expenses),
      hint: `${expenses.length} logged`,
      color: "var(--danger)",
    },
  ];

  const TABS: { value: Tab; label: string; icon: typeof Icons.income; count?: number }[] = [
    { value: "invoices", label: "Invoices", icon: Icons.income, count: invoices.length },
    { value: "plans", label: "Plans", icon: Icons.milestone, count: plans.length },
    { value: "schedules", label: "Schedules", icon: Icons.recurring, count: schedules.length },
    { value: "expenses", label: "Expenses", icon: Icons.expense, count: expenses.length },
  ];

  return (
    <>
      <PageHeader
        title="Finance"
        eyebrow="Side work · invoices & expenses"
        subtitle="Bill clients, track costs, and see profit per project."
        accent={MODULE.finance.color}
        action={
          <Link
            href="/sidework"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <Icons.back size={15} />
            Side work
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <p className="eyebrow">{c.label}</p>
            <p
              className="tnum mt-2 text-2xl font-semibold"
              style={{ color: c.color }}
            >
              {c.value}
            </p>
            <p className="mt-0.5 text-[11px] text-text-faint">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border-strong bg-bg-elevated p-1">
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-active text-text"
                  : "text-text-muted hover:text-text",
              )}
            >
              <t.icon size={15} />
              {t.label}
              {t.count ? (
                <span className="tnum text-[11px] text-text-faint">{t.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "invoices" ? (
        <InvoicesPanel
          invoices={invoices}
          projects={projects}
          autoNewProject={initial.newInvoice ? (initial.projectId ?? "") : null}
        />
      ) : tab === "plans" ? (
        <PlansSection
          plans={plans}
          projects={projects}
          invoices={invoices}
          autoNewProject={initial.newPlan ? (initial.projectId ?? "") : null}
        />
      ) : tab === "schedules" ? (
        <SchedulesPanel schedules={schedules} projects={projects} />
      ) : (
        <ExpensesPanel
          expenses={expenses}
          accounts={accounts}
          projects={projects}
          autoNewProject={initial.newExpense ? (initial.projectId ?? "") : null}
        />
      )}
    </>
  );
}
