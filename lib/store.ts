import { promises as fs } from "fs";
import path from "path";
import type { Collections, CollectionName } from "./types";

// File-backed JSON store. One file per collection under /data.
// On first read, if a collection file is missing we seed it from /data.seed.

// Resolve the data directory. Defaults to <cwd>/data for the Next app; the MCP
// server sets DASHBOARD_DATA_DIR so it reads/writes the same files regardless of
// where it's launched from. The seed folder is always its sibling.
const DATA_DIR = process.env.DASHBOARD_DATA_DIR
  ? path.resolve(process.env.DASHBOARD_DATA_DIR)
  : path.join(process.cwd(), "data");
const SEED_DIR = path.join(path.dirname(DATA_DIR), "data.seed");

function fileFor(name: CollectionName) {
  return path.join(DATA_DIR, `${name}.json`);
}

async function ensureSeeded(name: CollectionName) {
  const target = fileFor(name);
  try {
    await fs.access(target);
    return; // already exists
  } catch {
    // not present — fall through and seed
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  let contents = "[]";
  try {
    contents = await fs.readFile(path.join(SEED_DIR, `${name}.json`), "utf8");
  } catch {
    // no seed file — start empty
  }
  await fs.writeFile(target, contents, "utf8");
}

export async function readCollection<N extends CollectionName>(
  name: N,
): Promise<Collections[N][]> {
  await ensureSeeded(name);
  try {
    const raw = await fs.readFile(fileFor(name), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Collections[N][]) : [];
  } catch {
    return [];
  }
}

export async function writeCollection<N extends CollectionName>(
  name: N,
  items: Collections[N][],
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = fileFor(name);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(tmp, target); // atomic swap
}

// Insert or update a record by id; returns the saved record.
export async function upsert<N extends CollectionName>(
  name: N,
  record: Collections[N],
): Promise<Collections[N]> {
  const items = await readCollection(name);
  const idx = items.findIndex((r) => r.id === record.id);
  if (idx >= 0) items[idx] = record;
  else items.push(record);
  await writeCollection(name, items);
  return record;
}

// Remove a record by id; returns true if something was removed.
export async function remove<N extends CollectionName>(
  name: N,
  id: string,
): Promise<boolean> {
  const items = await readCollection(name);
  const next = items.filter((r) => r.id !== id);
  if (next.length === items.length) return false;
  await writeCollection(name, next);
  return true;
}
