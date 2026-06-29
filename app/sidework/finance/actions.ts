"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { upsert, remove, readCollection } from "@/lib/store";
import type {
  Invoice,
  RecurringInvoice,
  FinanceExpense,
  ExpenseAccount,
  PaymentPlan,
} from "@/lib/types";
import { advanceDate, materializeInvoice } from "@/lib/invoices";
import { installmentToInvoice } from "@/lib/finance";
import { newId, todayISO } from "@/lib/utils";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const INVOICE_DIR = "finance"; // data/uploads/finance/<invoiceId>/

// Touch every surface that reads finance data. Project pages are revalidated
// by id when an invoice/expense is linked to one.
function revalidateFinance(projectId?: string) {
  revalidatePath("/sidework/finance");
  revalidatePath("/sidework");
  revalidatePath("/calendar");
  revalidatePath("/");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function safeName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "file"
  );
}

/* ----------------------------------------------------------------- invoices */
export async function saveInvoice(invoice: Invoice) {
  await upsert("invoices", invoice);
  revalidateFinance(invoice.projectId);
}

export async function deleteInvoice(id: string) {
  const inv = (await readCollection("invoices")).find((i) => i.id === id);
  // Best-effort: drop any uploaded attachment folder for this invoice.
  await fs.rm(path.join(UPLOADS_DIR, INVOICE_DIR, id), {
    recursive: true,
    force: true,
  });
  await remove("invoices", id);
  revalidateFinance(inv?.projectId);
}

// Store an uploaded invoice file under data/uploads/finance/<invoiceId>/ and
// return its relative path + name so the client can attach it to the draft.
export async function uploadInvoiceFile(
  invoiceId: string,
  formData: FormData,
): Promise<{ path: string; name: string } | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  const stored = `${newId()}-${safeName(file.name)}`;
  const dir = path.join(UPLOADS_DIR, INVOICE_DIR, invoiceId);
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, stored), bytes);
  return { path: `${INVOICE_DIR}/${invoiceId}/${stored}`, name: file.name };
}

// Remove a previously uploaded attachment file (best-effort).
export async function removeInvoiceFile(relPath: string) {
  const target = path.join(UPLOADS_DIR, relPath);
  if (target.startsWith(UPLOADS_DIR + path.sep)) {
    await fs.rm(target, { force: true });
  }
}

/* -------------------------------------------------- recurring schedules */
export async function saveSchedule(schedule: RecurringInvoice) {
  await upsert("recurring-invoices", schedule);
  revalidateFinance(schedule.projectId);
}

export async function deleteSchedule(id: string) {
  await remove("recurring-invoices", id);
  revalidateFinance();
}

export async function generateFromSchedule(id: string) {
  const schedule = (await readCollection("recurring-invoices")).find(
    (s) => s.id === id,
  );
  if (!schedule) return;
  const invoice = materializeInvoice(schedule);
  await upsert("invoices", invoice);
  await upsert("recurring-invoices", {
    ...schedule,
    nextDate: advanceDate(schedule.nextDate, schedule.cadence),
    lastGenerated: todayISO(),
  });
  revalidateFinance(schedule.projectId);
}

/* ------------------------------------------------------------ payment plans */
export async function savePlan(plan: PaymentPlan) {
  await upsert("payment-plans", plan);
  revalidateFinance(plan.projectId);
}

export async function deletePlan(id: string) {
  const plan = (await readCollection("payment-plans")).find((p) => p.id === id);
  await remove("payment-plans", id);
  revalidateFinance(plan?.projectId);
}

// Issue a draft invoice from one installment and stamp the installment with the
// new invoice id. One-off — nothing repeats.
export async function generateInstallment(
  planId: string,
  installmentId: string,
) {
  const plan = (await readCollection("payment-plans")).find(
    (p) => p.id === planId,
  );
  if (!plan) return;
  const inst = plan.installments.find((i) => i.id === installmentId);
  if (!inst || inst.invoiceId) return;

  const invoice = installmentToInvoice(plan, inst);
  await upsert("invoices", invoice);
  await upsert("payment-plans", {
    ...plan,
    installments: plan.installments.map((i) =>
      i.id === installmentId ? { ...i, invoiceId: invoice.id } : i,
    ),
  });
  revalidateFinance(plan.projectId);
}

/* ----------------------------------------------------------------- expenses */
export async function saveExpense(expense: FinanceExpense) {
  await upsert("finance-expenses", expense);
  revalidateFinance(expense.projectId);
}

export async function deleteExpense(id: string) {
  const exp = (await readCollection("finance-expenses")).find(
    (e) => e.id === id,
  );
  await remove("finance-expenses", id);
  revalidateFinance(exp?.projectId);
}

/* ---------------------------------------------------------- expense accounts */
export async function saveAccount(account: ExpenseAccount) {
  await upsert("expense-accounts", account);
  revalidateFinance();
}

// Deleting an account leaves its expenses intact but un-files them (accountId
// is cleared so nothing dangles).
export async function deleteAccount(id: string) {
  const expenses = await readCollection("finance-expenses");
  for (const e of expenses) {
    if (e.accountId === id) {
      await upsert("finance-expenses", { ...e, accountId: undefined });
    }
  }
  await remove("expense-accounts", id);
  revalidateFinance();
}
