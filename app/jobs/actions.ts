"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { Job } from "@/lib/types";

export async function saveJob(job: Job) {
  await upsert("jobs", job);
  revalidatePath("/jobs");
  revalidatePath("/");
}

export async function deleteJob(id: string) {
  await remove("jobs", id);
  revalidatePath("/jobs");
  revalidatePath("/");
}
