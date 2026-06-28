import { readCollection } from "@/lib/store";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const [projects, templates] = await Promise.all([
    readCollection("projects"),
    readCollection("templates"),
  ]);
  return <ProjectsClient projects={projects} templates={templates} />;
}
