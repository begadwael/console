"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { PartTimeEntry } from "@/lib/types";

export async function saveEntry(entry: PartTimeEntry) {
  await upsert("part-time", entry);
  revalidatePath("/part-time");
  revalidatePath("/");
}

export async function deleteEntry(id: string) {
  await remove("part-time", id);
  revalidatePath("/part-time");
  revalidatePath("/");
}
