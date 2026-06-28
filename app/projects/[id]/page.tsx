import { notFound } from "next/navigation";
import { readCollection } from "@/lib/store";
import { ProjectDetail } from "./ProjectDetail";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projects = await readCollection("projects");
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
