"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { upsert, remove, readCollection } from "@/lib/store";
import { newId } from "@/lib/utils";
import type { Project, ProjectDoc } from "@/lib/types";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

// The whole project record (with its nested milestones/tasks/documents) is
// upserted on every change — simple and atomic for a single-user local app.
export async function saveProject(project: Project) {
  await upsert("projects", project);
  revalidatePath("/projects");
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/sidework");
  revalidatePath("/");
}

export async function deleteProject(id: string) {
  // Best-effort: drop any uploaded files for this project too.
  await fs.rm(path.join(UPLOADS_DIR, id), { recursive: true, force: true });
  await remove("projects", id);
  revalidatePath("/projects");
  revalidatePath("/sidework");
  revalidatePath("/");
}

function safeName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "file"
  );
}

// Store an uploaded file on disk under data/uploads/<projectId>/ and attach a
// document record to the project.
export async function uploadDocument(projectId: string, formData: FormData) {
  const file = formData.get("file");
  const title = (formData.get("title") as string | null)?.trim();
  if (!(file instanceof File) || file.size === 0) return;

  const projects = await readCollection("projects");
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  const id = newId();
  const stored = `${id}-${safeName(file.name)}`;
  const dir = path.join(UPLOADS_DIR, projectId);
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, stored), bytes);

  const doc: ProjectDoc = {
    id,
    title: title || file.name,
    kind: "file",
    fileName: file.name,
    path: `${projectId}/${stored}`,
    size: file.size,
  };
  await upsert("projects", {
    ...project,
    documents: [...project.documents, doc],
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

// Remove a document; if it's a stored file, delete it from disk too.
export async function deleteDocument(projectId: string, docId: string) {
  const projects = await readCollection("projects");
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  const doc = project.documents.find((d) => d.id === docId);
  if (doc?.kind === "file" && doc.path) {
    // Guard against path traversal before unlinking.
    const target = path.join(UPLOADS_DIR, doc.path);
    if (target.startsWith(UPLOADS_DIR + path.sep)) {
      await fs.rm(target, { force: true });
    }
  }
  await upsert("projects", {
    ...project,
    documents: project.documents.filter((d) => d.id !== docId),
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}
