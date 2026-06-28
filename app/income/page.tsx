import { readCollection } from "@/lib/store";
import { IncomeClient } from "./IncomeClient";

export default async function IncomePage() {
  const [invoices, projects] = await Promise.all([
    readCollection("invoices"),
    readCollection("projects"),
  ]);
  return (
    <IncomeClient
      invoices={invoices}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
