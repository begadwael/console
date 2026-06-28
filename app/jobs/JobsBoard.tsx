"use client";

import { useState, useTransition } from "react";
import { JOB_STATUSES, type Job, type JobStatus } from "@/lib/types";
import { JOB_STATUS_META, MODULE } from "@/lib/meta";
import { newId, dueLabel, dueTone } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { Field, Input, Textarea, Segmented } from "@/components/ui/form";
import { Kanban, type Column } from "@/components/board/Kanban";
import { Icons } from "@/components/ui/icons";
import { saveJob, deleteJob } from "./actions";

const COLUMNS: Column[] = JOB_STATUSES.map((s) => ({
  id: s,
  label: JOB_STATUS_META[s].label,
  color: JOB_STATUS_META[s].color,
}));

const TONE_COLOR = {
  overdue: "var(--danger)",
  soon: "var(--warning)",
  later: "var(--text-faint)",
} as const;

function emptyJob(status: JobStatus = "saved"): Job {
  return { id: "", company: "", role: "", status };
}

export function JobsBoard({ jobs }: { jobs: Job[] }) {
  const [items, setItems] = useState(jobs);
  const [prevSig, setPrevSig] = useState("");
  const [draft, setDraft] = useState<Job | null>(null);
  const [pending, startTransition] = useTransition();

  // Sync local state when the server sends fresh data (add / quick-add / delete).
  // Adjusting state during render is React's recommended pattern over an effect.
  const sig = jobs.map((j) => `${j.id}:${j.status}:${j.role}`).join("|");
  if (sig !== prevSig) {
    setPrevSig(sig);
    setItems(jobs);
  }

  function move(id: string, toStatus: string) {
    const status = toStatus as JobStatus;
    setItems((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status } : j)),
    );
    const job = items.find((j) => j.id === id);
    if (job) startTransition(() => saveJob({ ...job, status }));
  }

  function save() {
    if (!draft) return;
    const record: Job = { ...draft, id: draft.id || newId() };
    setItems((prev) => {
      const exists = prev.some((j) => j.id === record.id);
      return exists
        ? prev.map((j) => (j.id === record.id ? record : j))
        : [...prev, record];
    });
    startTransition(async () => {
      await saveJob(record);
      setDraft(null);
    });
  }

  function del() {
    if (!draft?.id) return;
    const id = draft.id;
    setItems((prev) => prev.filter((j) => j.id !== id));
    startTransition(async () => {
      await deleteJob(id);
      setDraft(null);
    });
  }

  return (
    <>
      <PageHeader
        title="Job search"
        eyebrow="Pipeline"
        subtitle="Drag a card between columns to update its stage."
        accent={MODULE.jobs.color}
        action={
          <Button variant="primary" onClick={() => setDraft(emptyJob())}>
            <Icons.plus size={16} />
            Add job
          </Button>
        }
      />

      <Kanban
        columns={COLUMNS}
        items={items}
        onMove={move}
        onAdd={(status) => setDraft(emptyJob(status as JobStatus))}
        renderCard={(job) => {
          const tone = dueTone(job.nextActionDate);
          return (
            <button
              onClick={() => setDraft(job)}
              className="w-full rounded-lg border border-border bg-surface p-3 pr-7 text-left transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <p className="text-sm font-medium text-text">{job.role}</p>
              <p className="text-xs text-text-muted">{job.company}</p>
              {job.nextAction ? (
                <div className="mt-2 flex items-center gap-1.5">
                  {tone ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TONE_COLOR[tone] }}
                    />
                  ) : null}
                  <span className="truncate text-xs text-text-muted">
                    {job.nextAction}
                  </span>
                </div>
              ) : null}
              {job.nextActionDate ? (
                <p
                  className="tnum mt-1 text-[11px]"
                  style={{
                    color: tone ? TONE_COLOR[tone] : "var(--text-faint)",
                  }}
                >
                  {dueLabel(job.nextActionDate)}
                </p>
              ) : null}
            </button>
          );
        }}
      />

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Job search"
        title={draft?.id ? "Edit job" : "Add job"}
      >
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company" required>
                <Input
                  autoFocus
                  required
                  value={draft.company}
                  onChange={(e) =>
                    setDraft({ ...draft, company: e.target.value })
                  }
                />
              </Field>
              <Field label="Role" required>
                <Input
                  required
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Stage">
              <Segmented
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                options={JOB_STATUSES.map((s) => ({
                  value: s,
                  label: JOB_STATUS_META[s].label,
                  color: JOB_STATUS_META[s].color,
                }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Next action">
                <Input
                  value={draft.nextAction ?? ""}
                  placeholder="e.g. Follow up"
                  onChange={(e) =>
                    setDraft({ ...draft, nextAction: e.target.value })
                  }
                />
              </Field>
              <Field label="Due">
                <Input
                  type="date"
                  value={draft.nextActionDate ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, nextActionDate: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Link">
              <Input
                type="url"
                placeholder="https://"
                value={draft.link ?? ""}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              />
            </Field>

            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            <ModalActions
              onCancel={() => setDraft(null)}
              onDelete={draft.id ? del : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
