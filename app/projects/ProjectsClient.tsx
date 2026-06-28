"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type Project, type ProjectTemplate } from "@/lib/types";
import { PROJECT_STATUS_META, MODULE } from "@/lib/meta";
import { projectProgress, nextMilestone } from "@/lib/projects";
import { newId, todayISO, dueLabel, dueTone } from "@/lib/utils";
import { instantiateTemplate } from "@/lib/templates";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Icons } from "@/components/ui/icons";
import { ProjectMetaModal } from "@/components/projects/ProjectMetaModal";
import { saveProject } from "./actions";

function blankProject(): Project {
  return {
    id: "",
    name: "",
    status: "active",
    sidework: true, // most projects are Side work
    color: "#f472b6",
    createdAt: "",
    milestones: [],
    tasks: [],
    documents: [],
  };
}

const ORDER: Record<string, number> = { active: 0, paused: 1, done: 2 };

export function ProjectsClient({
  projects,
  templates,
}: {
  projects: Project[];
  templates: ProjectTemplate[];
}) {
  const [draft, setDraft] = useState<Project | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = [...projects].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status],
  );

  function startBlank() {
    setTemplateId(null);
    setDraft(blankProject());
  }

  // Prefill the new-project form from a template; full structure is built on save.
  function startFromTemplate(t: ProjectTemplate) {
    setTemplateId(t.id);
    setDraft({
      ...blankProject(),
      name: t.name,
      description: t.description,
      sidework: t.sidework ?? true,
      color: t.color ?? "#f472b6",
      startDate: todayISO(),
    });
  }

  function create() {
    if (!draft) return;
    const start = draft.startDate || todayISO();
    const tpl = templateId ? templates.find((t) => t.id === templateId) : null;
    const built = tpl ? instantiateTemplate(tpl, start) : null;
    const record: Project = {
      ...draft,
      id: newId(),
      createdAt: new Date().toISOString(),
      startDate: start,
      dueDate: draft.dueDate || built?.dueDate,
      milestones: built?.milestones ?? draft.milestones,
      tasks: built?.tasks ?? draft.tasks,
      documents: built?.documents ?? draft.documents,
    };
    startTransition(async () => {
      await saveProject(record);
      setDraft(null);
      setTemplateId(null);
      router.push(`/projects/${record.id}`);
    });
  }

  return (
    <>
      <PageHeader
        title="Projects"
        eyebrow="Workspaces"
        subtitle="Each project has its own timeline, deliverables, and documents."
        accent={MODULE.projects.color}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/templates"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Icons.template size={15} />
              Templates
            </Link>
            <Button variant="primary" onClick={startBlank}>
              <Icons.plus size={16} />
              New project
            </Button>
          </div>
        }
      />

      {templates.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Start from template</span>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => startFromTemplate(t)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-hover"
            >
              <Icons.template
                size={13}
                style={{ color: t.color ?? "var(--projects)" }}
              />
              {t.name}
            </button>
          ))}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Icons.projects}
          message="No projects yet. Spin one up to start tracking it."
          action={
            <Button variant="secondary" onClick={startBlank}>
              <Icons.plus size={15} />
              New project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const { done, total, pct } = projectProgress(p);
            const accent = p.color ?? MODULE.projects.color;
            const sm = PROJECT_STATUS_META[p.status];
            const next = nextMilestone(p);
            const tone = dueTone(p.dueDate);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                  }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold tracking-tight text-text">
                      {p.name}
                    </h3>
                    {p.client ? (
                      <p className="text-xs text-text-muted">{p.client}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.sidework ? (
                      <Badge color="var(--sidework)">
                        <Icons.sidework size={11} />
                        Side work
                      </Badge>
                    ) : null}
                    <Badge color={sm.color} dot>
                      {sm.label}
                    </Badge>
                  </div>
                </div>

                {p.description ? (
                  <p className="mt-2 line-clamp-2 text-xs text-text-faint">
                    {p.description}
                  </p>
                ) : null}

                {/* Progress */}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="eyebrow">Tasks · {pct}%</span>
                    <span className="tnum text-[11px] text-text-muted">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, backgroundColor: accent }}
                    />
                  </div>
                </div>

                {/* Footer: next milestone + due */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
                    <Icons.milestone size={12} style={{ color: accent }} />
                    <span className="truncate">
                      {next ? next.title : "No upcoming milestone"}
                    </span>
                  </span>
                  {p.dueDate ? (
                    <span
                      className="tnum shrink-0 text-[11px]"
                      style={{
                        color:
                          tone === "overdue"
                            ? "var(--danger)"
                            : tone === "soon"
                              ? "var(--warning)"
                              : "var(--text-faint)",
                      }}
                    >
                      {dueLabel(p.dueDate)}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectMetaModal
        draft={draft}
        isEdit={false}
        pending={pending}
        onChange={setDraft}
        onClose={() => {
          setDraft(null);
          setTemplateId(null);
        }}
        onSubmit={create}
      />
    </>
  );
}
