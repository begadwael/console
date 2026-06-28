import { promises as fs } from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Serves files uploaded to data/uploads/, e.g. GET /api/files/<projectId>/<name>.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const rel = segments.join("/");
  const target = path.join(UPLOADS_DIR, rel);

  // Reject anything that escapes the uploads directory.
  if (
    target !== UPLOADS_DIR &&
    !target.startsWith(UPLOADS_DIR + path.sep)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const file = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    const type = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const filename = path.basename(target).replace(/^[a-z0-9]+-/, "");
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
