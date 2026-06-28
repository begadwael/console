"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  CLIENT_STATUSES,
  INTERACTION_TYPES,
  type Client,
  type ClientStatus,
  type Interaction,
  type InteractionType,
} from "@/lib/types";
import { CLIENT_STATUS_META, MODULE } from "@/lib/meta";
import { newId, todayISO, formatDate, dueLabel, dueTone } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { Field, Input, Textarea, Segmented, Select } from "@/components/ui/form";
import { Kanban, type Column } from "@/components/board/Kanban";
import { Icons } from "@/components/ui/icons";
import { saveClient, deleteClient } from "./actions";

const COLUMNS: Column[] = CLIENT_STATUSES.map((s) => ({
  id: s,
  label: CLIENT_STATUS_META[s].label,
  color: CLIENT_STATUS_META[s].color,
}));

const TONE_COLOR = {
  overdue: "var(--danger)",
  soon: "var(--warning)",
  later: "var(--text-faint)",
} as const;

const INT_ICON = {
  note: Icons.doc,
  call: Icons.phone,
  email: Icons.mail,
  meeting: Icons.calendar,
} as const;

function emptyClient(status: ClientStatus = "lead"): Client {
  return { id: "", name: "", status, interactions: [] };
}

export function ClientsBoard({
  clients,
  projectCount,
  invoiceCount,
}: {
  clients: Client[];
  projectCount: Record<string, number>;
  invoiceCount: Record<string, number>;
}) {
  const [items, setItems] = useState(clients);
  const [prevSig, setPrevSig] = useState("");
  const [draft, setDraft] = useState<Client | null>(null);
  const [intDraft, setIntDraft] = useState<{
    type: InteractionType;
    summary: string;
  }>({ type: "note", summary: "" });
  const [pending, startTransition] = useTransition();

  const sig = clients.map((c) => `${c.id}:${c.status}:${c.name}`).join("|");
  if (sig !== prevSig) {
    setPrevSig(sig);
    setItems(clients);
  }

  const countFor = (
    map: Record<string, number>,
    name: string,
  ): number => map[name.trim().toLowerCase()] ?? 0;

  const followUpsDue = items.filter(
    (c) =>
      c.status !== "past" &&
      c.nextFollowUp &&
      dueTone(c.nextFollowUp) !== "later",
  ).length;

  function move(id: string, status: string) {
    const s = status as ClientStatus;
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: s } : c)));
    const client = items.find((c) => c.id === id);
    if (client) startTransition(() => saveClient({ ...client, status: s }));
  }

  function save() {
    if (!draft) return;
    const record: Client = { ...draft, id: draft.id || newId() };
    setItems((prev) => {
      const exists = prev.some((c) => c.id === record.id);
      return exists
        ? prev.map((c) => (c.id === record.id ? record : c))
        : [...prev, record];
    });
    startTransition(async () => {
      await saveClient(record);
      setDraft(null);
    });
  }

  function del() {
    if (!draft?.id) return;
    const id = draft.id;
    setItems((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteClient(id);
      setDraft(null);
    });
  }

  function addInteraction() {
    if (!draft || !intDraft.summary.trim()) return;
    const entry: Interaction = {
      id: newId(),
      date: todayISO(),
      type: intDraft.type,
      summary: intDraft.summary.trim(),
    };
    setDraft({
      ...draft,
      interactions: [entry, ...draft.interactions],
      lastContact: todayISO(),
    });
    setIntDraft({ type: intDraft.type, summary: "" });
  }
  function removeInteraction(id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      interactions: draft.interactions.filter((i) => i.id !== id),
    });
  }

  return (
    <>
      <Link
        href="/sidework"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <Icons.back size={15} />
        Side work
      </Link>

      <PageHeader
        title="Clients"
        eyebrow="CRM · side work"
        subtitle={
          followUpsDue > 0
            ? `${followUpsDue} follow-up${followUpsDue === 1 ? "" : "s"} due soon. Drag a card to change its stage.`
            : "Track leads, active clients, and the relationships behind your work."
        }
        accent={MODULE.sidework.color}
        action={
          <Button variant="primary" onClick={() => setDraft(emptyClient())}>
            <Icons.plus size={16} />
            Add client
          </Button>
        }
      />

      <Kanban
        columns={COLUMNS}
        items={items}
        onMove={move}
        onAdd={(status) => setDraft(emptyClient(status as ClientStatus))}
        renderCard={(client) => {
          const tone = dueTone(client.nextFollowUp);
          const projects = countFor(projectCount, client.name);
          const invoices = countFor(invoiceCount, client.name);
          return (
            <button
              onClick={() => setDraft(client)}
              className="w-full rounded-lg border border-border bg-surface p-3 pr-7 text-left transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <p className="text-sm font-medium text-text">{client.name}</p>
              {client.contact ? (
                <p className="truncate text-xs text-text-muted">
                  {client.contact}
                </p>
              ) : null}
              {client.nextFollowUp && client.status !== "past" ? (
                <p
                  className="tnum mt-2 flex items-center gap-1.5 text-[11px]"
                  style={{
                    color: tone ? TONE_COLOR[tone] : "var(--text-faint)",
                  }}
                >
                  <Icons.calendar size={11} />
                  Follow up {dueLabel(client.nextFollowUp)}
                </p>
              ) : null}
              {projects + invoices + client.interactions.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-text-faint">
                  {projects > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Icons.projects size={11} />
                      {projects}
                    </span>
                  ) : null}
                  {invoices > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Icons.income size={11} />
                      {invoices}
                    </span>
                  ) : null}
                  {client.interactions.length > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Icons.doc size={11} />
                      {client.interactions.length}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        }}
      />

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        eyebrow="Client"
        title={draft?.id ? draft.name || "Edit client" : "Add client"}
      >
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.name.trim()) save();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.name.trim())
                save();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client / company" required>
                <Input
                  autoFocus
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Contact person">
                <Input
                  value={draft.contact ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, contact: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <Input
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Stage">
              <Segmented
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                options={CLIENT_STATUSES.map((s) => ({
                  value: s,
                  label: CLIENT_STATUS_META[s].label,
                  color: CLIENT_STATUS_META[s].color,
                }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Next follow-up">
                <Input
                  type="date"
                  value={draft.nextFollowUp ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, nextFollowUp: e.target.value })
                  }
                />
              </Field>
              <Field label="Last contact">
                <Input
                  type="date"
                  value={draft.lastContact ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, lastContact: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            {/* Interaction log */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-muted">
                Interactions
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={intDraft.type}
                  onChange={(e) =>
                    setIntDraft({
                      ...intDraft,
                      type: e.target.value as InteractionType,
                    })
                  }
                  className="w-28 shrink-0"
                >
                  {INTERACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </Select>
                <Input
                  value={intDraft.summary}
                  onChange={(e) =>
                    setIntDraft({ ...intDraft, summary: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInteraction();
                    }
                  }}
                  placeholder="Log a note, call, email… and press Enter"
                />
              </div>

              {draft.interactions.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {draft.interactions.map((i) => {
                    const Icon = INT_ICON[i.type];
                    return (
                      <li
                        key={i.id}
                        className="group/int flex items-start gap-2.5 rounded-lg border border-border bg-bg-elevated/40 px-2.5 py-2"
                      >
                        <Icon
                          size={13}
                          className="mt-0.5 shrink-0 text-text-faint"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text">{i.summary}</p>
                          <p className="tnum text-[11px] text-text-faint">
                            {i.type} · {formatDate(i.date)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeInteraction(i.id)}
                          aria-label="Remove"
                          className="shrink-0 rounded p-0.5 text-text-faint opacity-0 transition-opacity hover:text-danger group-hover/int:opacity-100"
                        >
                          <Icons.close size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

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
