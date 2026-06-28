// Small shared helpers: ids, dates, class names.

export function newId(): string {
  // Time-sortable, collision-resistant enough for a single-user local app.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// Tailwind-friendly conditional class joiner.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Parse an ISO yyyy-mm-dd as a local date (avoids UTC off-by-one).
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// ISO yyyy-mm-dd for a local Date.
export function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysUntil(iso: string): number {
  const today = parseISO(todayISO());
  const target = parseISO(iso);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// Whole days from a to b (b - a).
export function daysBetween(aISO: string, bISO: string): number {
  return Math.round(
    (parseISO(bISO).getTime() - parseISO(aISO).getTime()) / 86_400_000,
  );
}

// Human-friendly relative label for a due date.
export function dueLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = daysUntil(iso);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${Math.abs(d)}d overdue`;
  return `in ${d}d`;
}

export function formatDate(iso?: string): string | null {
  if (!iso) return null;
  return parseISO(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// "overdue" | "soon" (<=2d) | "later" | null — drives due-date coloring.
export function dueTone(iso?: string): "overdue" | "soon" | "later" | null {
  if (!iso) return null;
  const d = daysUntil(iso);
  if (d < 0) return "overdue";
  if (d <= 2) return "soon";
  return "later";
}
