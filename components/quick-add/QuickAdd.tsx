"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/form";
import { Icons, MODULE_ICON } from "@/components/ui/icons";
import { MODULE } from "@/lib/meta";
import { newId, todayISO, cn } from "@/lib/utils";
import { saveJob } from "@/app/jobs/actions";
import { saveTask } from "@/app/sidework/actions";
import { saveEntry } from "@/app/part-time/actions";
import { saveItem } from "@/app/personal/actions";
import type { CollectionName } from "@/lib/types";

// Projects, income, and templates have their own dedicated flows, so quick-add
// covers just the four lightweight capture modules.
type Mod = Exclude<
  CollectionName,
  "projects" | "invoices" | "templates" | "budget-categories" | "expenses"
>;
const MODS: Mod[] = ["jobs", "sidework", "part-time", "personal"];

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [mod, setMod] = useState<Mod>("jobs");
  const [a, setA] = useState(""); // primary field (company / title / task)
  const [b, setB] = useState(""); // secondary field (role / hours)
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const firstRef = useRef<HTMLInputElement>(null);

  // Global shortcuts: "N" to open, ⌘K / Ctrl+K to open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (!typing && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function reset() {
    setA("");
    setB("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    if (!a.trim()) return;
    const id = newId();
    const action = (() => {
      switch (mod) {
        case "jobs":
          return saveJob({ id, company: a, role: b || "—", status: "saved" });
        case "sidework":
          return saveTask({ id, title: a, status: "todo", priority: "medium" });
        case "part-time":
          return saveEntry({
            id,
            date: todayISO(),
            task: a,
            hours: Number(b) || 1,
            done: false,
          });
        case "personal":
          return saveItem({ id, type: "todo", title: a });
      }
    })();
    startTransition(async () => {
      await action;
      router.refresh();
      close();
    });
  }

  const fields: Record<Mod, { a: string; b?: string; bType?: string }> = {
    jobs: { a: "Company", b: "Role" },
    sidework: { a: "Task title" },
    "part-time": { a: "Task / shift", b: "Hours", bType: "number" },
    personal: { a: "What needs doing?" },
  };
  const f = fields[mod];

  return (
    <Modal open={open} onClose={close} eyebrow="Quick add" title="Capture anything">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Module picker */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {MODS.map((m) => {
            const Icon = MODULE_ICON[m];
            const active = m === mod;
            const color = MODULE[m].color;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMod(m);
                  firstRef.current?.focus();
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors",
                  active
                    ? "border-border-strong bg-surface-active"
                    : "border-border bg-bg-elevated text-text-muted hover:bg-surface-hover",
                )}
                style={active ? { color } : undefined}
              >
                <Icon size={18} />
                <span className="text-[11px] font-medium text-text">
                  {MODULE[m].label}
                </span>
              </button>
            );
          })}
        </div>

        <Field label={f.a} required>
          <Input
            ref={firstRef}
            autoFocus
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder={f.a}
          />
        </Field>

        {f.b ? (
          <Field label={f.b}>
            <Input
              type={f.bType ?? "text"}
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder={f.b}
            />
          </Field>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-text-faint">
            Saves to {MODULE[mod].label}. Edit details on its page.
          </p>
          <button
            type="submit"
            disabled={pending || !a.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-fill px-3.5 py-2 text-sm font-semibold text-[#04122e] shadow-[0_2px_12px_-4px] shadow-accent/40 transition-[background-color,transform] duration-150 hover:bg-accent-strong hover:text-white active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add"}
            {!pending ? <Icons.enter size={13} /> : null}
          </button>
        </div>
      </form>
    </Modal>
  );
}
