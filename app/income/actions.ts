"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { Invoice } from "@/lib/types";

export async function saveInvoice(invoice: Invoice) {
  await upsert("invoices", invoice);
  revalidatePath("/income");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteInvoice(id: string) {
  await remove("invoices", id);
  revalidatePath("/income");
  revalidatePath("/calendar");
  revalidatePath("/");
}
