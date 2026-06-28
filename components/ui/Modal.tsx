"use client";

import { useEffect } from "react";
import { Icons } from "@/components/ui/icons";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-panel-in my-auto w-full max-w-lg rounded-2xl border border-border-strong bg-bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
            <h2 className="font-display text-lg font-semibold tracking-tight text-text">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <Icons.close size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Shared form footer: optional delete on the left, cancel + submit on the right.
export function ModalActions({
  onCancel,
  onDelete,
  pending,
  submitLabel = "Save",
}: {
  onCancel: () => void;
  onDelete?: () => void;
  pending?: boolean;
  submitLabel?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 pt-1 ${onDelete ? "justify-between" : "justify-end"}`}
    >
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <Icons.trash size={14} />
          Delete
        </button>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-fill px-3.5 py-2 text-sm font-semibold text-[#04122e] shadow-[0_2px_12px_-4px] shadow-accent/40 transition-[background-color,transform] duration-150 hover:bg-accent-strong hover:text-white active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
          {!pending ? (
            <kbd className="tnum hidden items-center gap-0.5 rounded bg-black/15 px-1 text-[10px] sm:inline-flex">
              <Icons.enter size={11} />
            </kbd>
          ) : null}
        </button>
      </div>
    </div>
  );
}
