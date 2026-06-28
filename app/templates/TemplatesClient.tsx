"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProjectTemplate } from "@/lib/types";
import { MODULE } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Icons } from "@/components/ui/icons";
import { deleteTemplate } from "./actions";

export function TemplatesClient({
  templates,
}: {
  templates: ProjectTemplate[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <PageHeader
        title="Project templates"
        eyebrow="Reusable structures"
        subtitle="Spin up a new project pre-filled with milestones, tasks, and docs."
        accent={MODULE.projects.color}
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3.5 py-2 text-sm text-text transition-colors hover:bg-surface-hover"
          >
            <Icons.back size={15} />
            Projects
          </Link>
        }
      />

      <p className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3.5 py-2.5 text-xs text-text-muted">
        <Icons.template size={14} className="text-projects" />
        Create a project from a template on the Projects page. Save any project
        as a template from its page.
      </p>

      {templates.length === 0 ? (
        <EmptyState
          icon={Icons.template}
          message="No templates yet. Open a project and choose “Save as template.”"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {templates.map((t) => {
            const accent = t.color ?? MODULE.projects.color;
            const isOpen = open === t.id;
            return (
              <Card key={t.id} accent={accent}>
                <CardBody className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display truncate text-base font-semibold tracking-tight text-text">
                        {t.name}
                      </h3>
                      {t.description ? (
                        <p className="mt-0.5 text-xs text-text-muted">
                          {t.description}
                        </p>
                      ) : null}
                    </div>
                    {t.sidework ? (
                      <Badge color="var(--sidework)">
                        <Icons.sidework size={11} />
                        Side work
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-faint">
                    <span className="tnum">{t.milestones.length} milestones</span>
                    <span>·</span>
                    <span className="tnum">{t.tasks.length} tasks</span>
                    <span>·</span>
                    <span className="tnum">{t.documents.length} docs</span>
                    {t.durationDays ? (
                      <>
                        <span>·</span>
                        <span className="tnum">{t.durationDays}d</span>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setOpen(isOpen ? null : t.id)}
                      className="text-xs text-accent hover:underline"
                    >
                      {isOpen ? "Hide details" : "View details"}
                    </button>
                    <button
                      onClick={() =>
                        startTransition(() => deleteTemplate(t.id))
                      }
                      disabled={pending}
                      className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Icons.trash size={13} />
                      Delete
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <Section title="Milestones">
                        {t.milestones.map((m, i) => (
                          <Row
                            key={i}
                            label={m.title}
                            meta={m.offsetDays != null ? `day ${m.offsetDays}` : ""}
                          />
                        ))}
                      </Section>
                      <Section title="Tasks">
                        {t.tasks.map((task, i) => (
                          <Row
                            key={i}
                            label={task.title}
                            meta={cn(
                              task.priority ?? "",
                              task.subtasks?.length
                                ? `· ${task.subtasks.length} subtasks`
                                : "",
                            )}
                          />
                        ))}
                      </Section>
                      {t.documents.length > 0 ? (
                        <Section title="Documents">
                          {t.documents.map((d, i) => (
                            <Row key={i} label={d.title} meta="" />
                          ))}
                        </Section>
                      ) : null}
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="truncate text-text">{label}</span>
      {meta.trim() ? (
        <span className="tnum shrink-0 text-[11px] text-text-faint">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
