import { notFound } from "next/navigation";
import { readCollection } from "@/lib/store";
import { ProjectDetail } from "./ProjectDetail";
import { ProjectFinance } from "./ProjectFinance";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [projects, invoices, expenses] = await Promise.all([
    readCollection("projects"),
    readCollection("invoices"),
    readCollection("finance-expenses"),
  ]);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  return (
    <ProjectDetail
      project={project}
      financeSlot={
        <ProjectFinance
          projectId={project.id}
          invoices={invoices}
          expenses={expenses}
          accent={project.color ?? "var(--projects)"}
        />
      }
    />
  );
}
