"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PROJECT_TASK_STATUSES,
  PRIORITIES,
  type Project,
  type Milestone,
  type ProjectTask,
  type ProjectTaskStatus,
  type ProjectDoc,
  type Subtask,
} from "@/lib/types";
import {
  PROJECT_TASK_STATUS_META,
  PRIORITY_META,
  PROJECT_STATUS_META,
  MODULE,
} from "@/lib/meta";
import { projectProgress, sortedMilestones } from "@/lib/projects";
import { projectToTemplate } from "@/lib/templates";
import { newId, formatDate, dueLabel, dueTone, todayISO, cn } from "@/lib/utils";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Field, Input, Textarea, Segmented } from "@/components/ui/form";
import { Kanban, type Column } from "@/components/board/Kanban";
import { Icons } from "@/components/ui/icons";
import { ProjectMetaModal } from "@/components/projects/ProjectMetaModal";
import {
  saveProject,
  deleteProject,
  uploadDocument,
  deleteDocument,
} from "../actions";
import { saveTemplate } from "@/app/templates/actions";

const TONE_COLOR = {
  overdue: "var(--danger)",
  soon: "var(--warning)",
  later: "var(--text-faint)",
} as const;

type TabKey = "tasks" | "timeline" | "documents" | "finance";

const TASK_COLUMNS: Column[] = PROJECT_TASK_STATUSES.map((s) => ({
  id: s,
  label: PROJECT_TASK_STATUS_META[s].label,
  color: PROJECT_TASK_STATUS_META[s].color,
}));

function emptyTask(status: ProjectTaskStatus = "todo"): ProjectTask {
  return { id: "", title: "", status, priority: "medium", subtasks: [] };
}

function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectDetail({
  project: initial,
  financeSlot,
}: {
  project: Project;
  financeSlot?: React.ReactNode;
}) {
  const [project, setProject] = useState(initial);
  const [prevSig, setPrevSig] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [meta, setMeta] = useState<Project | null>(null);
  const [mDraft, setMDraft] = useState<Milestone | null>(null);
  const [tDraft, setTDraft] = useState<ProjectTask | null>(null);
  const [docDraft, setDocDraft] = useState<ProjectDoc | null>(null);
  const [subInput, setSubInput] = useState("");
  const [tplName, setTplName] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("tasks");

  // Sync from server on load / external changes; local stays source of truth.
  const sig = `${initial.id}:${initial.name}:${initial.status}:${initial.sidework}:${initial.milestones.length}:${initial.tasks.length}:${initial.documents.length}`;
  if (sig !== prevSig) {
    setPrevSig(sig);
    setProject(initial);
  }

  const accent = project.color ?? MODULE.projects.color;
  const { done, total, pct } = projectProgress(project);
  const sm = PROJECT_STATUS_META[project.status];

  function persist(next: Project) {
    setProject(next);
    startTransition(() => saveProject(next));
  }

  // ---- tasks ----
  function moveTask(id: string, status: string) {
    persist({
      ...project,
      tasks: project.tasks.map((t) =>
        t.id === id ? { ...t, status: status as ProjectTaskStatus } : t,
      ),
    });
  }
  function saveTask() {
    if (!tDraft) return;
    const t = { ...tDraft, id: tDraft.id || newId() };
    const tasks = project.tasks.some((x) => x.id === t.id)
      ? project.tasks.map((x) => (x.id === t.id ? t : x))
      : [...project.tasks, t];
    persist({ ...project, tasks });
    setTDraft(null);
    setSubInput("");
  }
  function deleteTask(id: string) {
    persist({ ...project, tasks: project.tasks.filter((x) => x.id !== id) });
    setTDraft(null);
  }

  // subtask edits operate on the open task draft
  function addSubtask() {
    if (!tDraft || !subInput.trim()) return;
    setTDraft({
      ...tDraft,
      subtasks: [
        ...tDraft.subtasks,
        { id: newId(), title: subInput.trim(), done: false },
      ],
    });
    setSubInput("");
  }
  function patchSubtask(id: string, patch: Partial<Subtask>) {
    if (!tDraft) return;
    setTDraft({
      ...tDraft,
      subtasks: tDraft.subtasks.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  }
  function removeSubtask(id: string) {
    if (!tDraft) return;
    setTDraft({
      ...tDraft,
      subtasks: tDraft.subtasks.filter((s) => s.id !== id),
    });
  }

  // ---- milestones ----
  function saveMilestone() {
    if (!mDraft) return;
    const m = { ...mDraft, id: mDraft.id || newId() };
    const milestones = project.milestones.some((x) => x.id === m.id)
      ? project.milestones.map((x) => (x.id === m.id ? m : x))
      : [...project.milestones, m];
    persist({ ...project, milestones });
    setMDraft(null);
  }
  function deleteMilestone(id: string) {
    persist({
      ...project,
      milestones: project.milestones.filter((x) => x.id !== id),
    });
    setMDraft(null);
  }
  function toggleMilestone(m: Milestone) {
    persist({
      ...project,
      milestones: project.milestones.map((x) =>
        x.id === m.id ? { ...x, done: !x.done } : x,
      ),
    });
  }

  // ---- documents ----
  function saveDocLink() {
    if (!docDraft) return;
    const doc = { ...docDraft, id: docDraft.id || newId(), kind: "link" as const };
    const documents = project.documents.some((x) => x.id === doc.id)
      ? project.documents.map((x) => (x.id === doc.id ? doc : x))
      : [...project.documents, doc];
    persist({ ...project, documents });
    setDocDraft(null);
  }
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("title", file.name);
    startUpload(() => uploadDocument(project.id, fd));
  }
  function removeDoc(docId: string) {
    // optimistic removal; server action also unlinks the file from disk
    setProject({
      ...project,
      documents: project.documents.filter((d) => d.id !== docId),
    });
    startTransition(() => deleteDocument(project.id, docId));
    setDocDraft(null);
  }

  // ---- project meta ----
  function saveMeta() {
    if (!meta) return;
    persist(meta);
    setMeta(null);
  }
  function removeProject() {
    startTransition(async () => {
      await deleteProject(project.id);
      router.push("/projects");
    });
  }

  function saveAsTemplate() {
    if (tplName === null) return;
    const name = tplName.trim() || `${project.name} template`;
    startTransition(() => saveTemplate(projectToTemplate(project, name)));
    setTplName(null);
  }

  const dateRange = [project.startDate, project.dueDate]
    .filter(Boolean)
    .map((d) => formatDate(d))
    .join(" → ");

  return (
    <>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <Icons.back size={15} />
        Projects
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            {project.client ? project.client : "Project"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
              {project.name}
            </h1>
            <Badge color={sm.color} dot>
              {sm.label}
            </Badge>
            {project.sidework ? (
              <Badge color="var(--sidework)">
                <Icons.sidework size={11} />
                Side work
              </Badge>
            ) : null}
          </div>
          {project.description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
              {project.description}
            </p>
          ) : null}
          {dateRange ? (
            <p className="tnum mt-2 flex items-center gap-1.5 text-xs text-text-faint">
              <Icons.calendar size={13} />
              {dateRange}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setTplName(`${project.name} template`)}
          >
            <Icons.template size={15} />
            <span className="hidden sm:inline">Save as template</span>
          </Button>
          <Button variant="secondary" onClick={() => setMeta(project)}>
            <Icons.edit size={15} />
            Edit
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-5">
        <CardBody className="pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="eyebrow">Overall progress</span>
            <span className="tnum shrink-0 text-sm font-medium text-text">
              {pct}%{" "}
              <span className="text-text-faint">
                ({done}/{total} done)
              </span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundColor: accent }}
            />
          </div>
        </CardBody>
      </Card>

      {/* ---- Tabs ---- */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-border-strong bg-bg-elevated p-1">
        {(
          [
            { key: "tasks", label: "Tasks", icon: Icons.todo, count: project.tasks.length },
            { key: "timeline", label: "Timeline", icon: Icons.milestone, count: project.milestones.length },
            { key: "documents", label: "Documents", icon: Icons.doc, count: project.documents.length },
            { key: "finance", label: "Finance", icon: Icons.finance },
          ] as { key: TabKey; label: string; icon: typeof Icons.todo; count?: number }[]
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-active text-text"
                  : "text-text-muted hover:text-text",
              )}
              style={active ? { color: accent } : undefined}
            >
              <t.icon size={15} />
              {t.label}
              {typeof t.count === "number" && t.count > 0 ? (
                <span className="tnum text-[11px] text-text-faint">{t.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ---- Tasks panel ---- */}
      {tab === "tasks" ? (
        <section className="mb-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg-elevated"
            style={{ color: accent }}
          >
            <Icons.todo size={15} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-text">
              Tasks
            </h2>
            <p className="eyebrow mt-0.5">Drag between columns · open a card for subtasks</p>
          </div>
        </div>
        {project.tasks.length === 0 ? (
          <EmptyState
            icon={Icons.todo}
            message="No tasks yet. Break the work into cards."
            action={
              <Button variant="secondary" onClick={() => setTDraft(emptyTask())}>
                <Icons.plus size={15} />
                Add task
              </Button>
            }
          />
        ) : (
          <Kanban
            columns={TASK_COLUMNS}
            items={project.tasks}
            onMove={moveTask}
            onAdd={(status) => setTDraft(emptyTask(status as ProjectTaskStatus))}
            renderCard={(task) => {
              const pri = PRIORITY_META[task.priority];
              const subDone = task.subtasks.filter((s) => s.done).length;
              const tone = dueTone(task.dueDate);
              return (
                <button
                  onClick={() => setTDraft(task)}
                  className={cn(
                    "w-full rounded-lg border border-border bg-surface p-3 pr-7 text-left transition-colors hover:border-border-strong hover:bg-surface-hover",
                    task.status === "done" && "opacity-65",
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium text-text",
                      task.status === "done" && "line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge color={pri.color} dot>
                      {pri.label}
                    </Badge>
                    {task.subtasks.length > 0 ? (
                      <span className="tnum inline-flex items-center gap-1 text-[11px] text-text-faint">
                        <Icons.check size={11} />
                        {subDone}/{task.subtasks.length}
                      </span>
                    ) : null}
                    {task.dueDate && task.status !== "done" ? (
                      <span
                        className="tnum text-[11px]"
                        style={{
                          color: tone ? TONE_COLOR[tone] : "var(--text-faint)",
                        }}
                      >
                        {dueLabel(task.dueDate)}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            }}
          />
        )}
        </section>
      ) : null}

      {/* ---- Timeline panel ---- */}
      {tab === "timeline" ? (
        <Card accent={accent}>
          <CardHeader
            title="Timeline"
            subtitle="Milestones in date order"
            icon={<Icons.milestone size={15} />}
            accent={accent}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setMDraft({ id: "", title: "", date: todayISO(), done: false })
                }
              >
                <Icons.plus size={14} />
                Add
              </Button>
            }
          />
          <CardBody>
            {project.milestones.length === 0 ? (
              <EmptyState
                icon={Icons.milestone}
                message="No milestones yet. Map out the timeline."
              />
            ) : (
              <ol className="relative ml-1 border-l border-border">
                {sortedMilestones(project.milestones).map((m) => {
                  const tone = dueTone(m.date);
                  return (
                    <li key={m.id} className="relative py-2 pl-6">
                      <button
                        onClick={() => toggleMilestone(m)}
                        aria-label={m.done ? "Mark not done" : "Mark done"}
                        className="absolute -left-[7px] top-3.5"
                      >
                        {m.done ? (
                          <Icons.done size={14} style={{ color: accent }} />
                        ) : (
                          <span
                            className="block h-3 w-3 rounded-full border-2 bg-bg"
                            style={{ borderColor: "var(--border-strong)" }}
                          />
                        )}
                      </button>
                      <button
                        onClick={() => setMDraft(m)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span
                          className={cn(
                            "text-sm",
                            m.done ? "text-text-muted line-through" : "text-text",
                          )}
                        >
                          {m.title}
                        </span>
                        {m.date ? (
                          <span
                            className="tnum shrink-0 text-xs"
                            style={{
                              color:
                                m.done || !tone
                                  ? "var(--text-faint)"
                                  : TONE_COLOR[tone],
                            }}
                          >
                            {formatDate(m.date)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* ---- Documents panel ---- */}
      {tab === "documents" ? (
        <Card accent={accent}>
          <CardHeader
            title="Documents"
            subtitle="Links & files"
            icon={<Icons.doc size={15} />}
            accent={accent}
            action={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDocDraft({ id: "", title: "", kind: "link", url: "" })
                  }
                >
                  <Icons.plus size={14} />
                  Link
                </Button>
              </div>
            }
          />
          <CardBody>
            <input
              ref={fileInput}
              type="file"
              hidden
              onChange={onPickFile}
            />
            {project.documents.length === 0 ? (
              <EmptyState
                icon={Icons.doc}
                message="No documents yet. Add a link or upload a file."
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {project.documents.map((doc) => {
                  const href =
                    doc.kind === "file"
                      ? `/api/files/${doc.path}`
                      : doc.url ?? "#";
                  const Icon =
                    doc.kind === "file" ? Icons.doc : Icons.docLink;
                  return (
                    <li
                      key={doc.id}
                      className="group/doc flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
                    >
                      <Icon size={14} className="shrink-0 text-text-faint" />
                      <button
                        onClick={() =>
                          doc.kind === "link" ? setDocDraft(doc) : undefined
                        }
                        className={cn(
                          "min-w-0 flex-1 truncate text-left text-sm text-text",
                          doc.kind === "file" && "cursor-default",
                        )}
                      >
                        {doc.title}
                        <span className="block truncate text-[11px] text-text-faint">
                          {doc.kind === "file"
                            ? formatBytes(doc.size)
                            : doc.note}
                        </span>
                      </button>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${doc.title}`}
                        className="shrink-0 rounded p-1 text-text-faint opacity-0 transition-opacity hover:bg-surface-active hover:text-text group-hover/doc:opacity-100"
                      >
                        <Icons.link size={14} />
                      </a>
                      {doc.kind === "file" ? (
                        <button
                          onClick={() => removeDoc(doc.id)}
                          aria-label={`Delete ${doc.title}`}
                          className="shrink-0 rounded p-1 text-text-faint opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover/doc:opacity-100"
                        >
                          <Icons.trash size={13} />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* ---- Finance panel ---- */}
      {tab === "finance" ? <div className="mb-6">{financeSlot}</div> : null}

      {/* ---- Edit project meta ---- */}
      <ProjectMetaModal
        draft={meta}
        isEdit
        pending={pending}
        onChange={setMeta}
        onClose={() => setMeta(null)}
        onSubmit={saveMeta}
        onDelete={removeProject}
      />

      {/* ---- Save as template ---- */}
      <Modal
        open={tplName !== null}
        onClose={() => setTplName(null)}
        eyebrow="Templates"
        title="Save as template"
      >
        {tplName !== null ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveAsTemplate();
            }}
          >
            <p className="text-sm text-text-muted">
              Saves this project&rsquo;s milestones, tasks, subtasks, and document
              titles as a reusable template (dates become offsets from the start).
            </p>
            <Field label="Template name" required>
              <Input
                autoFocus
                required
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
              />
            </Field>
            <ModalActions onCancel={() => setTplName(null)} pending={pending} />
          </form>
        ) : null}
      </Modal>

      {/* ---- Task modal ---- */}
      <Modal
        open={!!tDraft}
        onClose={() => {
          setTDraft(null);
          setSubInput("");
        }}
        eyebrow="Task"
        title={tDraft?.id ? "Edit task" : "Add task"}
      >
        {tDraft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (tDraft.title.trim()) saveTask();
            }}
          >
            <Field label="Title" required>
              <Input
                autoFocus
                required
                value={tDraft.title}
                onChange={(e) =>
                  setTDraft({ ...tDraft, title: e.target.value })
                }
              />
            </Field>

            <Field label="Description">
              <Textarea
                value={tDraft.description ?? ""}
                onChange={(e) =>
                  setTDraft({ ...tDraft, description: e.target.value })
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <Segmented
                  value={tDraft.priority}
                  onChange={(priority) => setTDraft({ ...tDraft, priority })}
                  options={PRIORITIES.map((p) => ({
                    value: p,
                    label: PRIORITY_META[p].label,
                    color: PRIORITY_META[p].color,
                  }))}
                />
              </Field>
              <Field label="Due">
                <Input
                  type="date"
                  value={tDraft.dueDate ?? ""}
                  onChange={(e) =>
                    setTDraft({ ...tDraft, dueDate: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Status">
              <Segmented
                value={tDraft.status}
                onChange={(status) => setTDraft({ ...tDraft, status })}
                options={PROJECT_TASK_STATUSES.map((s) => ({
                  value: s,
                  label: PROJECT_TASK_STATUS_META[s].label,
                  color: PROJECT_TASK_STATUS_META[s].color,
                }))}
              />
            </Field>

            {/* Subtasks / checklist */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-muted">
                Subtasks
              </p>
              <div className="space-y-1.5">
                {tDraft.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={(e) =>
                        patchSubtask(s.id, { done: e.target.checked })
                      }
                      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--projects)]"
                    />
                    <input
                      value={s.title}
                      onChange={(e) =>
                        patchSubtask(s.id, { title: e.target.value })
                      }
                      className={cn(
                        "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text focus:border-border-strong focus:bg-bg-elevated focus:outline-none",
                        s.done && "text-text-muted line-through",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeSubtask(s.id)}
                      aria-label="Remove subtask"
                      className="shrink-0 rounded p-1 text-text-faint hover:bg-danger/10 hover:text-danger"
                    >
                      <Icons.close size={13} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0" />
                  <Input
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    placeholder="Add a subtask and press Enter"
                    className="py-1.5"
                  />
                </div>
              </div>
            </div>

            <ModalActions
              onCancel={() => {
                setTDraft(null);
                setSubInput("");
              }}
              onDelete={tDraft.id ? () => deleteTask(tDraft.id) : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* ---- Milestone modal ---- */}
      <Modal
        open={!!mDraft}
        onClose={() => setMDraft(null)}
        eyebrow="Timeline"
        title={mDraft?.id ? "Edit milestone" : "Add milestone"}
      >
        {mDraft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (mDraft.title.trim()) saveMilestone();
            }}
          >
            <Field label="Milestone" required>
              <Input
                autoFocus
                required
                value={mDraft.title}
                onChange={(e) => setMDraft({ ...mDraft, title: e.target.value })}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={mDraft.date ?? ""}
                onChange={(e) => setMDraft({ ...mDraft, date: e.target.value })}
              />
            </Field>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={mDraft.done}
                onChange={(e) => setMDraft({ ...mDraft, done: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-[var(--projects)]"
              />
              Reached
            </label>
            <ModalActions
              onCancel={() => setMDraft(null)}
              onDelete={mDraft.id ? () => deleteMilestone(mDraft.id) : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* ---- Document link modal ---- */}
      <Modal
        open={!!docDraft}
        onClose={() => setDocDraft(null)}
        eyebrow="Document"
        title={docDraft?.id ? "Edit link" : "Add link"}
      >
        {docDraft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (docDraft.title.trim() && (docDraft.url ?? "").trim())
                saveDocLink();
            }}
          >
            <Field label="Title" required>
              <Input
                autoFocus
                required
                value={docDraft.title}
                onChange={(e) =>
                  setDocDraft({ ...docDraft, title: e.target.value })
                }
              />
            </Field>
            <Field
              label="URL"
              required
              hint="Link to a Drive, Figma, Notion doc, etc."
            >
              <Input
                type="url"
                required
                placeholder="https://"
                value={docDraft.url ?? ""}
                onChange={(e) =>
                  setDocDraft({ ...docDraft, url: e.target.value })
                }
              />
            </Field>
            <Field label="Note">
              <Input
                value={docDraft.note ?? ""}
                onChange={(e) =>
                  setDocDraft({ ...docDraft, note: e.target.value })
                }
              />
            </Field>
            <ModalActions
              onCancel={() => setDocDraft(null)}
              onDelete={docDraft.id ? () => removeDoc(docDraft.id) : undefined}
              pending={pending}
            />
          </form>
        ) : null}
      </Modal>
    </>
  );
}
