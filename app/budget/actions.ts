"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { BudgetCategory, Expense } from "@/lib/types";

export async function saveCategory(category: BudgetCategory) {
  await upsert("budget-categories", category);
  revalidatePath("/budget");
}

export async function deleteCategory(id: string) {
  await remove("budget-categories", id);
  revalidatePath("/budget");
}

export async function saveExpense(expense: Expense) {
  await upsert("expenses", expense);
  revalidatePath("/budget");
}

export async function deleteExpense(id: string) {
  await remove("expenses", id);
  revalidatePath("/budget");
}
