"use client";

import { PROJECT_STATUSES, type Project } from "@/lib/types";
import { PROJECT_STATUS_META } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { Field, Input, Textarea, Segmented } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";

const SWATCHES = ["#f472b6", "#5b9dff", "#a78bfa", "#34d3b4", "#f5b455", "#56d364"];

// Controlled modal: the parent owns `draft` (null = closed) and applies edits
// via onChange — same pattern as the board/list modals elsewhere in the app.
export function ProjectMetaModal({
  draft,
  onChange,
  onClose,
  onSubmit,
  onDelete,
  pending,
  isEdit,
}: {
  draft: Project | null;
  onChange: (project: Project) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  pending?: boolean;
  isEdit?: boolean;
}) {
  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      eyebrow="Projects"
      title={isEdit ? "Edit project" : "New project"}
    >
      {draft ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.name.trim()) onSubmit();
          }}
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.key === "Enter" &&
              draft.name.trim()
            )
              onSubmit();
          }}
        >
          <Field label="Project name" required>
            <Input
              autoFocus
              required
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="e.g. Acme Brand Refresh"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) =>
                onChange({ ...draft, description: e.target.value })
              }
              placeholder="What is this project about?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <Input
                value={draft.client ?? ""}
                onChange={(e) => onChange({ ...draft, client: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Segmented
                value={draft.status}
                onChange={(status) => onChange({ ...draft, status })}
                options={PROJECT_STATUSES.map((s) => ({
                  value: s,
                  label: PROJECT_STATUS_META[s].label,
                  color: PROJECT_STATUS_META[s].color,
                }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input
                type="date"
                value={draft.startDate ?? ""}
                onChange={(e) =>
                  onChange({ ...draft, startDate: e.target.value })
                }
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(e) => onChange({ ...draft, dueDate: e.target.value })}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border-strong bg-bg-elevated px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-text">
              <Icons.sidework size={15} className="text-sidework" />
              Side work project
              <span className="text-xs text-text-faint">
                · shows on the Side work page
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.sidework}
              onChange={(e) => onChange({ ...draft, sidework: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-[var(--sidework)]"
            />
          </label>

          <Field label="Accent">
            <div className="flex gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use ${c}`}
                  onClick={() => onChange({ ...draft, color: c })}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    draft.color === c ? "border-text" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          <ModalActions
            onCancel={onClose}
            onDelete={isEdit ? onDelete : undefined}
            pending={pending}
            submitLabel={isEdit ? "Save" : "Create project"}
          />
        </form>
      ) : null}
    </Modal>
  );
}
