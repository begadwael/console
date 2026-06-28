"use server";

import { revalidatePath } from "next/cache";
import { upsert, remove } from "@/lib/store";
import type { Client } from "@/lib/types";

export async function saveClient(client: Client) {
  await upsert("clients", client);
  revalidatePath("/sidework/clients");
  revalidatePath("/sidework");
}

export async function deleteClient(id: string) {
  await remove("clients", id);
  revalidatePath("/sidework/clients");
  revalidatePath("/sidework");
}
