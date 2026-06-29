import Link from "next/link";
import type { Invoice, FinanceExpense } from "@/lib/types";
import { INVOICE_STATUS_META } from "@/lib/meta";
import { projectPnl } from "@/lib/finance";
import { isOverdue, formatMoney } from "@/lib/invoices";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";

// Per-project P&L panel, rendered on the project page below ProjectDetail.
// Read-only here — "Add" buttons deep-link into the Finance hub prefilled with
// this project, so there's one editor to maintain.
export function ProjectFinance({
  projectId,
  invoices,
  expenses,
  accent,
}: {
  projectId: string;
  invoices: Invoice[];
  expenses: FinanceExpense[];
  accent: string;
}) {
  const inv = invoices.filter((i) => i.projectId === projectId);
  const exp = expenses.filter((e) => e.projectId === projectId);
  const pnl = projectPnl(projectId, invoices, expenses);

  const base = `/sidework/finance?project=${projectId}`;

  const stats = [
    { label: "Received", value: formatMoney(pnl.received), color: "var(--income)" },
    {
      label: "Outstanding",
      value: formatMoney(pnl.outstanding),
      color: "var(--text)",
    },
    { label: "Expenses", value: formatMoney(pnl.expenses), color: "var(--danger)" },
    {
      label: "Net",
      value: formatMoney(pnl.net),
      color: pnl.net < 0 ? "var(--danger)" : "var(--income)",
    },
  ];

  return (
    <Card accent={accent}>
      <CardHeader
        title="Finance"
        subtitle="Income & costs for this project"
        icon={<Icons.finance size={15} />}
        accent={accent}
        action={
          <Link
            href={`${base}&tab=invoices`}
            className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
          >
            Open in Finance <Icons.arrow size={12} />
          </Link>
        }
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-bg-elevated p-3"
            >
              <p className="eyebrow">{s.label}</p>
              <p
                className="tnum mt-1 text-lg font-semibold"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Invoices */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="eyebrow flex items-center gap-1.5">
                <Icons.income size={12} /> Invoices
              </p>
              <Link
                href={`${base}&tab=invoices&new=invoice`}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Icons.plus size={12} /> Add
              </Link>
            </div>
            {inv.length === 0 ? (
              <p className="text-xs text-text-faint">No invoices yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                {inv.map((i, idx) => {
                  const over = isOverdue(i);
                  const meta = INVOICE_STATUS_META[i.status];
                  return (
                    <div
                      key={i.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2",
                        idx > 0 && "border-t border-border",
                      )}
                    >
                      <Badge color={over ? "var(--danger)" : meta.color} dot>
                        {over ? "Overdue" : meta.label}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                        {i.title || i.client}
                      </span>
                      <span className="tnum shrink-0 text-xs font-medium text-text">
                        {formatMoney(i.amount, i.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expenses */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="eyebrow flex items-center gap-1.5">
                <Icons.expense size={12} /> Expenses
              </p>
              <Link
                href={`${base}&tab=expenses&new=expense`}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Icons.plus size={12} /> Add
              </Link>
            </div>
            {exp.length === 0 ? (
              <p className="text-xs text-text-faint">No expenses yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                {exp.map((e, idx) => (
                  <div
                    key={e.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2",
                      idx > 0 && "border-t border-border",
                    )}
                  >
                    <span className="tnum shrink-0 text-[11px] text-text-faint">
                      {formatDate(e.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                      {e.vendor || e.description || "Expense"}
                    </span>
                    <span className="tnum shrink-0 text-xs font-medium text-text">
                      {formatMoney(e.amount, e.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
