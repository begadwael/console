"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { PersonalItem } from "@/lib/types";

export async function saveItem(item: PersonalItem) {
  await upsert("personal", item);
  revalidatePath("/personal");
  revalidatePath("/");
}

export async function deleteItem(id: string) {
  await remove("personal", id);
  revalidatePath("/personal");
  revalidatePath("/");
}
