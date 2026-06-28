import { readCollection } from "@/lib/store";
import { ClientsBoard } from "./ClientsBoard";

export default async function ClientsPage() {
  const [clients, projects, invoices] = await Promise.all([
    readCollection("clients"),
    readCollection("projects"),
    readCollection("invoices"),
  ]);

  // Count linked projects / invoices per client by name (case-insensitive).
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const projectCount: Record<string, number> = {};
  for (const p of projects) {
    const k = norm(p.client);
    if (k) projectCount[k] = (projectCount[k] ?? 0) + 1;
  }
  const invoiceCount: Record<string, number> = {};
  for (const inv of invoices) {
    const k = norm(inv.client);
    if (k) invoiceCount[k] = (invoiceCount[k] ?? 0) + 1;
  }

  return (
    <ClientsBoard
      clients={clients}
      projectCount={projectCount}
      invoiceCount={invoiceCount}
    />
  );
}
