"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { ProjectTemplate } from "@/lib/types";

export async function saveTemplate(template: ProjectTemplate) {
  await upsert("templates", template);
  revalidatePath("/templates");
  revalidatePath("/projects");
}

export async function deleteTemplate(id: string) {
  await remove("templates", id);
  revalidatePath("/templates");
  revalidatePath("/projects");
}
