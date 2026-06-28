"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { SideWorkTask } from "@/lib/types";

export async function saveTask(task: SideWorkTask) {
  await upsert("sidework", task);
  revalidatePath("/sidework");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await remove("sidework", id);
  revalidatePath("/sidework");
  revalidatePath("/");
}
