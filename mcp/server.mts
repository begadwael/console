/**
 * Personal Dashboard MCP server.
 *
 * Exposes the dashboard's data as MCP tools so any Claude session can read and
 * write it ("add a job at Stripe", "create a project", "mark task X done").
 * It writes the same data/*.json files the Next app uses, so changes show up in
 * the dashboard on the next page load / refresh.
 *
 * Run:  npx tsx mcp/server.ts   (the npm "mcp" script does this)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Job,
  SideWorkTask,
  PartTimeEntry,
  PersonalItem,
  Project,
  ProjectTask,
  Milestone,
  ProjectDoc,
  Subtask,
  Invoice,
  RecurringInvoice,
  PaymentPlan,
  PlanInstallment,
  FinanceExpense,
  ExpenseAccount,
  BudgetCategory,
  Expense,
  Client,
  Interaction,
} from "../lib/types";

// Point the shared store at THIS repo's data dir before importing it, so the
// server works no matter what directory it's launched from.
const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.DASHBOARD_DATA_DIR) {
  process.env.DASHBOARD_DATA_DIR = path.join(here, "..", "data");
}

const { readCollection, upsert, remove } = await import("../lib/store");
const { newId, todayISO } = await import("../lib/utils");
const { projectProgress } = await import("../lib/projects");
const { instantiateTemplate } = await import("../lib/templates");
const { advanceDate, materializeInvoice } = await import("../lib/invoices");
const { projectPnl, financeSummary, planProgress, installmentToInvoice } =
  await import("../lib/finance");
const budget = await import("../lib/budget");
const T = await import("../lib/types");

// zod enum that preserves the literal union type from a const array.
const en = <A extends readonly [string, ...string[]]>(a: A) =>
  z.enum(a as unknown as [A[number], ...A[number][]]);

function text(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

// Drop undefined keys so update tools only overwrite fields that were provided.
function defined<O extends object>(obj: O): Partial<O> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<O>;
}

function countBy<I>(items: I[], key: (i: I) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[key(i)] = (out[key(i)] ?? 0) + 1;
  return out;
}

async function getProject(id: string): Promise<Project | null> {
  const projects = await readCollection("projects");
  return projects.find((p) => p.id === id) ?? null;
}

const server = new McpServer({ name: "personal-dashboard", version: "1.0.0" });

/* ------------------------------------------------------------------ overview */
server.registerTool(
  "get_overview",
  {
    description:
      "Snapshot of the whole dashboard: counts per module and a list of projects. Call this first to orient before adding or changing things.",
    inputSchema: {},
  },
  async () => {
    const [jobs, sidework, partTime, personal, projects] = await Promise.all([
      readCollection("jobs"),
      readCollection("sidework"),
      readCollection("part-time"),
      readCollection("personal"),
      readCollection("projects"),
    ]);
    return text({
      jobs: { total: jobs.length, byStatus: countBy(jobs, (j) => j.status) },
      sideworkTasks: { total: sidework.length, byStatus: countBy(sidework, (t) => t.status) },
      partTimeEntries: partTime.length,
      personalItems: personal.length,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        sidework: p.sidework,
        progress: projectProgress(p).pct,
        tasks: p.tasks.length,
      })),
    });
  },
);

/* ---------------------------------------------------------------------- jobs */
server.registerTool(
  "list_jobs",
  { description: "List all job applications.", inputSchema: {} },
  async () => text(await readCollection("jobs")),
);

server.registerTool(
  "add_job",
  {
    description: "Add a job application to the pipeline.",
    inputSchema: {
      company: z.string(),
      role: z.string(),
      status: en(T.JOB_STATUSES).optional(),
      appliedDate: z.string().optional().describe("ISO yyyy-mm-dd"),
      nextAction: z.string().optional(),
      nextActionDate: z.string().optional().describe("ISO yyyy-mm-dd"),
      link: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: Job = {
      id: newId(),
      company: a.company,
      role: a.role,
      status: a.status ?? "saved",
      appliedDate: a.appliedDate,
      nextAction: a.nextAction,
      nextActionDate: a.nextActionDate,
      link: a.link,
      notes: a.notes,
    };
    await upsert("jobs", record);
    return text({ added: record });
  },
);

server.registerTool(
  "update_job",
  {
    description:
      "Update fields on an existing job by id. Only provided fields change.",
    inputSchema: {
      id: z.string(),
      company: z.string().optional(),
      role: z.string().optional(),
      status: en(T.JOB_STATUSES).optional(),
      appliedDate: z.string().optional(),
      nextAction: z.string().optional(),
      nextActionDate: z.string().optional(),
      link: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const cur = (await readCollection("jobs")).find((j) => j.id === id);
    if (!cur) return text(`No job with id ${id}`);
    const next = { ...cur, ...defined(patch) };
    await upsert("jobs", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "delete_job",
  { description: "Delete a job by id.", inputSchema: { id: z.string() } },
  async ({ id }) =>
    text((await remove("jobs", id)) ? `Deleted ${id}` : `No job ${id}`),
);

/* ------------------------------------------------------------------ sidework work */
server.registerTool(
  "list_sidework_tasks",
  { description: "List all Side work tasks.", inputSchema: {} },
  async () => text(await readCollection("sidework")),
);

server.registerTool(
  "add_sidework_task",
  {
    description: "Add a task to the Side work board.",
    inputSchema: {
      title: z.string(),
      client: z.string().optional(),
      status: en(T.TASK_STATUSES).optional(),
      priority: en(T.PRIORITIES).optional(),
      dueDate: z.string().optional().describe("ISO yyyy-mm-dd"),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: SideWorkTask = {
      id: newId(),
      title: a.title,
      client: a.client,
      status: a.status ?? "todo",
      priority: a.priority ?? "medium",
      dueDate: a.dueDate,
      notes: a.notes,
    };
    await upsert("sidework", record);
    return text({ added: record });
  },
);

server.registerTool(
  "update_sidework_task",
  {
    description: "Update an Side work task by id. Only provided fields change.",
    inputSchema: {
      id: z.string(),
      title: z.string().optional(),
      client: z.string().optional(),
      status: en(T.TASK_STATUSES).optional(),
      priority: en(T.PRIORITIES).optional(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const cur = (await readCollection("sidework")).find((t) => t.id === id);
    if (!cur) return text(`No Side work task with id ${id}`);
    const next = { ...cur, ...defined(patch) };
    await upsert("sidework", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "delete_sidework_task",
  { description: "Delete an Side work task by id.", inputSchema: { id: z.string() } },
  async ({ id }) =>
    text((await remove("sidework", id)) ? `Deleted ${id}` : `No task ${id}`),
);

/* ----------------------------------------------------------------- part-time */
server.registerTool(
  "list_part_time",
  { description: "List all part-time work entries.", inputSchema: {} },
  async () => text(await readCollection("part-time")),
);

server.registerTool(
  "add_part_time_entry",
  {
    description: "Log a part-time work entry (shift or task).",
    inputSchema: {
      task: z.string(),
      date: z.string().optional().describe("ISO yyyy-mm-dd, defaults to today"),
      hours: z.number().optional(),
      done: z.boolean().optional(),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: PartTimeEntry = {
      id: newId(),
      task: a.task,
      date: a.date ?? todayISO(),
      hours: a.hours ?? 1,
      done: a.done ?? false,
      notes: a.notes,
    };
    await upsert("part-time", record);
    return text({ added: record });
  },
);

server.registerTool(
  "delete_part_time_entry",
  {
    description: "Delete a part-time entry by id.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) =>
    text((await remove("part-time", id)) ? `Deleted ${id}` : `No entry ${id}`),
);

/* ------------------------------------------------------------------ personal */
server.registerTool(
  "list_personal",
  {
    description: "List all personal items (habits, goals, to-dos).",
    inputSchema: {},
  },
  async () => text(await readCollection("personal")),
);

server.registerTool(
  "add_personal_item",
  {
    description: "Add a personal habit, goal, or to-do.",
    inputSchema: {
      type: en(T.PERSONAL_TYPES),
      title: z.string(),
      cadence: z.string().optional().describe("e.g. daily, this month"),
      streak: z.number().optional(),
      done: z.boolean().optional(),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: PersonalItem = {
      id: newId(),
      type: a.type,
      title: a.title,
      cadence: a.cadence,
      streak: a.streak,
      done: a.done,
      notes: a.notes,
    };
    await upsert("personal", record);
    return text({ added: record });
  },
);

server.registerTool(
  "delete_personal_item",
  {
    description: "Delete a personal item by id.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) =>
    text((await remove("personal", id)) ? `Deleted ${id}` : `No item ${id}`),
);

/* ------------------------------------------------------------------ projects */
server.registerTool(
  "list_projects",
  { description: "List projects with status and progress.", inputSchema: {} },
  async () => {
    const projects = await readCollection("projects");
    return text(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        sidework: p.sidework,
        client: p.client,
        dueDate: p.dueDate,
        progress: projectProgress(p).pct,
        tasks: p.tasks.length,
        milestones: p.milestones.length,
        documents: p.documents.length,
      })),
    );
  },
);

server.registerTool(
  "get_project",
  {
    description:
      "Get a single project's full detail (tasks, milestones, documents).",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => text((await getProject(id)) ?? `No project with id ${id}`),
);

server.registerTool(
  "create_project",
  {
    description:
      "Create a new project. Returns its id (use it for tasks/milestones/docs).",
    inputSchema: {
      name: z.string(),
      description: z.string().optional(),
      status: en(T.PROJECT_STATUSES).optional(),
      sidework: z.boolean().optional().describe("linked to Side work, default true"),
      client: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      color: z.string().optional().describe("hex accent, e.g. #f472b6"),
    },
  },
  async (a) => {
    const record: Project = {
      id: newId(),
      name: a.name,
      description: a.description,
      status: a.status ?? "active",
      sidework: a.sidework ?? true,
      client: a.client,
      startDate: a.startDate,
      dueDate: a.dueDate,
      color: a.color,
      createdAt: new Date().toISOString(),
      milestones: [],
      tasks: [],
      documents: [],
    };
    await upsert("projects", record);
    return text({ created: { id: record.id, name: record.name } });
  },
);

server.registerTool(
  "update_project",
  {
    description:
      "Update a project's top-level fields by id (not its tasks/milestones).",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: en(T.PROJECT_STATUSES).optional(),
      sidework: z.boolean().optional(),
      client: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      color: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const p = await getProject(id);
    if (!p) return text(`No project with id ${id}`);
    await upsert("projects", { ...p, ...defined(patch) });
    return text({ updated: { id, ...defined(patch) } });
  },
);

server.registerTool(
  "delete_project",
  { description: "Delete a project by id.", inputSchema: { id: z.string() } },
  async ({ id }) =>
    text((await remove("projects", id)) ? `Deleted ${id}` : `No project ${id}`),
);

server.registerTool(
  "add_project_task",
  {
    description: "Add a task (with optional subtasks) to a project's board.",
    inputSchema: {
      projectId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      status: en(T.PROJECT_TASK_STATUSES).optional(),
      priority: en(T.PRIORITIES).optional(),
      dueDate: z.string().optional(),
      subtasks: z.array(z.string()).optional().describe("subtask titles"),
    },
  },
  async (a) => {
    const p = await getProject(a.projectId);
    if (!p) return text(`No project with id ${a.projectId}`);
    const task: ProjectTask = {
      id: newId(),
      title: a.title,
      description: a.description,
      status: a.status ?? "todo",
      priority: a.priority ?? "medium",
      dueDate: a.dueDate,
      subtasks: (a.subtasks ?? []).map((title) => ({
        id: newId(),
        title,
        done: false,
      })),
    };
    await upsert("projects", { ...p, tasks: [...p.tasks, task] });
    return text({ added: task, toProject: p.name });
  },
);

server.registerTool(
  "update_project_task",
  {
    description:
      "Update a task within a project. Only provided fields change. Pass subtasks to replace the whole checklist.",
    inputSchema: {
      projectId: z.string(),
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: en(T.PROJECT_TASK_STATUSES).optional(),
      priority: en(T.PRIORITIES).optional(),
      dueDate: z.string().optional(),
      subtasks: z
        .array(z.object({ title: z.string(), done: z.boolean() }))
        .optional(),
    },
  },
  async ({ projectId, taskId, subtasks, ...patch }) => {
    const p = await getProject(projectId);
    if (!p) return text(`No project with id ${projectId}`);
    if (!p.tasks.some((t) => t.id === taskId))
      return text(`No task ${taskId} in project ${projectId}`);
    const replacement: Subtask[] | undefined = subtasks?.map((s) => ({
      id: newId(),
      title: s.title,
      done: s.done,
    }));
    const tasks = p.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            ...defined(patch),
            ...(replacement ? { subtasks: replacement } : {}),
          }
        : t,
    );
    await upsert("projects", { ...p, tasks });
    return text({ updated: tasks.find((t) => t.id === taskId) });
  },
);

server.registerTool(
  "delete_project_task",
  {
    description: "Delete a task from a project.",
    inputSchema: { projectId: z.string(), taskId: z.string() },
  },
  async ({ projectId, taskId }) => {
    const p = await getProject(projectId);
    if (!p) return text(`No project with id ${projectId}`);
    await upsert("projects", {
      ...p,
      tasks: p.tasks.filter((t) => t.id !== taskId),
    });
    return text(`Deleted task ${taskId}`);
  },
);

server.registerTool(
  "add_milestone",
  {
    description: "Add a milestone to a project's timeline.",
    inputSchema: {
      projectId: z.string(),
      title: z.string(),
      date: z.string().optional().describe("ISO yyyy-mm-dd"),
      done: z.boolean().optional(),
    },
  },
  async (a) => {
    const p = await getProject(a.projectId);
    if (!p) return text(`No project with id ${a.projectId}`);
    const milestone: Milestone = {
      id: newId(),
      title: a.title,
      date: a.date,
      done: a.done ?? false,
    };
    await upsert("projects", {
      ...p,
      milestones: [...p.milestones, milestone],
    });
    return text({ added: milestone });
  },
);

server.registerTool(
  "delete_milestone",
  {
    description: "Delete a milestone from a project.",
    inputSchema: { projectId: z.string(), milestoneId: z.string() },
  },
  async ({ projectId, milestoneId }) => {
    const p = await getProject(projectId);
    if (!p) return text(`No project with id ${projectId}`);
    await upsert("projects", {
      ...p,
      milestones: p.milestones.filter((m) => m.id !== milestoneId),
    });
    return text(`Deleted milestone ${milestoneId}`);
  },
);

server.registerTool(
  "add_project_link",
  {
    description:
      "Attach a document link (Drive/Figma/Notion/etc.) to a project. File uploads must be done from the dashboard UI.",
    inputSchema: {
      projectId: z.string(),
      title: z.string(),
      url: z.string(),
      note: z.string().optional(),
    },
  },
  async (a) => {
    const p = await getProject(a.projectId);
    if (!p) return text(`No project with id ${a.projectId}`);
    const doc: ProjectDoc = {
      id: newId(),
      title: a.title,
      kind: "link",
      url: a.url,
      note: a.note,
    };
    await upsert("projects", { ...p, documents: [...p.documents, doc] });
    return text({ added: doc });
  },
);

server.registerTool(
  "delete_project_document",
  {
    description: "Remove a document from a project by its id.",
    inputSchema: { projectId: z.string(), docId: z.string() },
  },
  async ({ projectId, docId }) => {
    const p = await getProject(projectId);
    if (!p) return text(`No project with id ${projectId}`);
    await upsert("projects", {
      ...p,
      documents: p.documents.filter((d) => d.id !== docId),
    });
    return text(`Deleted document ${docId}`);
  },
);

/* ------------------------------------------------------------------- income */
server.registerTool(
  "list_invoices",
  { description: "List all invoices.", inputSchema: {} },
  async () => text(await readCollection("invoices")),
);

server.registerTool(
  "add_invoice",
  {
    description: "Create an invoice. status: draft | sent | paid.",
    inputSchema: {
      client: z.string(),
      amount: z.number(),
      title: z.string().optional(),
      currency: z.string().optional().describe("ISO code, default USD"),
      status: en(T.INVOICE_STATUSES).optional(),
      channel: z
        .string()
        .optional()
        .describe(
          "Payment channel: bank | wise | paypal | stripe | cash | cheque | crypto | other (free-form ok)",
        ),
      projectId: z.string().optional(),
      issuedDate: z.string().optional().describe("ISO yyyy-mm-dd"),
      dueDate: z.string().optional().describe("ISO yyyy-mm-dd"),
      paidDate: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: Invoice = {
      id: newId(),
      client: a.client,
      amount: a.amount,
      title: a.title,
      currency: a.currency ?? "USD",
      status: a.status ?? "draft",
      channel: a.channel,
      projectId: a.projectId,
      issuedDate: a.issuedDate ?? todayISO(),
      dueDate: a.dueDate,
      paidDate:
        (a.status ?? "draft") === "paid" ? (a.paidDate ?? todayISO()) : a.paidDate,
      notes: a.notes,
    };
    await upsert("invoices", record);
    return text({ added: record });
  },
);

server.registerTool(
  "update_invoice",
  {
    description:
      "Update an invoice by id. Only provided fields change. Marking paid sets paidDate to today if not given.",
    inputSchema: {
      id: z.string(),
      client: z.string().optional(),
      amount: z.number().optional(),
      title: z.string().optional(),
      currency: z.string().optional(),
      status: en(T.INVOICE_STATUSES).optional(),
      channel: z.string().optional(),
      projectId: z.string().optional(),
      issuedDate: z.string().optional(),
      dueDate: z.string().optional(),
      paidDate: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const cur = (await readCollection("invoices")).find((i) => i.id === id);
    if (!cur) return text(`No invoice with id ${id}`);
    const next = { ...cur, ...defined(patch) };
    if (next.status === "paid" && !next.paidDate) next.paidDate = todayISO();
    await upsert("invoices", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "delete_invoice",
  { description: "Delete an invoice by id.", inputSchema: { id: z.string() } },
  async ({ id }) =>
    text((await remove("invoices", id)) ? `Deleted ${id}` : `No invoice ${id}`),
);

/* -------------------------------------------------- recurring invoices */
server.registerTool(
  "list_recurring_invoices",
  {
    description: "List recurring invoice schedules (retainers, etc.).",
    inputSchema: {},
  },
  async () => text(await readCollection("recurring-invoices")),
);

server.registerTool(
  "add_recurring_invoice",
  {
    description:
      "Create a recurring invoice schedule that issues a draft invoice on a cadence (typically a project retainer). Issuing is explicit — use generate_invoice_from_schedule.",
    inputSchema: {
      client: z.string(),
      amount: z.number(),
      cadence: en(T.INVOICE_CADENCES).describe(
        "weekly | monthly | quarterly | yearly",
      ),
      nextDate: z.string().describe("ISO yyyy-mm-dd — next issue date"),
      title: z.string().optional(),
      currency: z.string().optional().describe("ISO code, default USD"),
      channel: z.string().optional(),
      projectId: z.string().optional(),
      dueDays: z
        .number()
        .optional()
        .describe("days from issue to due date, default 14"),
      active: z.boolean().optional().describe("default true"),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: RecurringInvoice = {
      id: newId(),
      client: a.client,
      amount: a.amount,
      cadence: a.cadence,
      nextDate: a.nextDate,
      title: a.title,
      currency: a.currency ?? "USD",
      channel: a.channel,
      projectId: a.projectId,
      dueDays: a.dueDays ?? 14,
      active: a.active ?? true,
      notes: a.notes,
    };
    await upsert("recurring-invoices", record);
    return text({ added: record });
  },
);

server.registerTool(
  "update_recurring_invoice",
  {
    description: "Update a recurring schedule by id. Only provided fields change.",
    inputSchema: {
      id: z.string(),
      client: z.string().optional(),
      amount: z.number().optional(),
      cadence: en(T.INVOICE_CADENCES).optional(),
      nextDate: z.string().optional(),
      title: z.string().optional(),
      currency: z.string().optional(),
      channel: z.string().optional(),
      projectId: z.string().optional(),
      dueDays: z.number().optional(),
      active: z.boolean().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const cur = (await readCollection("recurring-invoices")).find(
      (s) => s.id === id,
    );
    if (!cur) return text(`No recurring invoice with id ${id}`);
    const next = { ...cur, ...defined(patch) };
    await upsert("recurring-invoices", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "generate_invoice_from_schedule",
  {
    description:
      "Issue a draft invoice from a recurring schedule and advance its nextDate by one cadence step.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const schedule = (await readCollection("recurring-invoices")).find(
      (s) => s.id === id,
    );
    if (!schedule) return text(`No recurring invoice with id ${id}`);
    const invoice = materializeInvoice(schedule);
    await upsert("invoices", invoice);
    await upsert("recurring-invoices", {
      ...schedule,
      nextDate: advanceDate(schedule.nextDate, schedule.cadence),
      lastGenerated: todayISO(),
    });
    return text({ generated: invoice });
  },
);

server.registerTool(
  "delete_recurring_invoice",
  {
    description: "Delete a recurring schedule by id.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) =>
    text(
      (await remove("recurring-invoices", id))
        ? `Deleted ${id}`
        : `No recurring invoice ${id}`,
    ),
);

/* -------------------------------------------------------- payment plans */
server.registerTool(
  "list_payment_plans",
  {
    description:
      "List payment plans (irregular invoice schedules) with per-installment billing status.",
    inputSchema: {},
  },
  async () => {
    const plans = await readCollection("payment-plans");
    return text(plans.map((p) => ({ ...p, progress: planProgress(p) })));
  },
);

server.registerTool(
  "add_payment_plan",
  {
    description:
      "Create a payment plan: several one-off installments billed on arbitrary dates against a project (e.g. 30% on signing, 40% at go-live, 30% on delivery).",
    inputSchema: {
      name: z.string(),
      client: z.string(),
      installments: z
        .array(
          z.object({
            label: z.string().optional(),
            date: z.string().describe("ISO yyyy-mm-dd — scheduled issue date"),
            amount: z.number(),
          }),
        )
        .describe("the staged installments"),
      projectId: z.string().optional(),
      currency: z.string().optional().describe("ISO code, default USD"),
      channel: z.string().optional(),
      dueDays: z.number().optional().describe("payment terms, default 14"),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: PaymentPlan = {
      id: newId(),
      name: a.name,
      client: a.client,
      projectId: a.projectId,
      currency: a.currency ?? "USD",
      channel: a.channel,
      dueDays: a.dueDays ?? 14,
      notes: a.notes,
      installments: a.installments.map((i) => ({
        id: newId(),
        label: i.label,
        date: i.date,
        amount: i.amount,
      })),
      createdAt: new Date().toISOString(),
    };
    await upsert("payment-plans", record);
    return text({ added: record });
  },
);

server.registerTool(
  "add_plan_installment",
  {
    description: "Add an installment to an existing payment plan.",
    inputSchema: {
      planId: z.string(),
      date: z.string().describe("ISO yyyy-mm-dd"),
      amount: z.number(),
      label: z.string().optional(),
    },
  },
  async (a) => {
    const plan = (await readCollection("payment-plans")).find(
      (p) => p.id === a.planId,
    );
    if (!plan) return text(`No payment plan with id ${a.planId}`);
    const inst: PlanInstallment = {
      id: newId(),
      label: a.label,
      date: a.date,
      amount: a.amount,
    };
    const next = { ...plan, installments: [...plan.installments, inst] };
    await upsert("payment-plans", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "generate_plan_installment",
  {
    description:
      "Issue a draft invoice for one plan installment and mark it billed.",
    inputSchema: { planId: z.string(), installmentId: z.string() },
  },
  async ({ planId, installmentId }) => {
    const plan = (await readCollection("payment-plans")).find(
      (p) => p.id === planId,
    );
    if (!plan) return text(`No payment plan with id ${planId}`);
    const inst = plan.installments.find((i) => i.id === installmentId);
    if (!inst) return text(`No installment ${installmentId} in plan ${planId}`);
    if (inst.invoiceId) return text(`Installment ${installmentId} already billed`);
    const invoice = installmentToInvoice(plan, inst);
    await upsert("invoices", invoice);
    await upsert("payment-plans", {
      ...plan,
      installments: plan.installments.map((i) =>
        i.id === installmentId ? { ...i, invoiceId: invoice.id } : i,
      ),
    });
    return text({ generated: invoice });
  },
);

server.registerTool(
  "delete_payment_plan",
  {
    description:
      "Delete a payment plan by id. Already-generated invoices are kept.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) =>
    text(
      (await remove("payment-plans", id)) ? `Deleted ${id}` : `No plan ${id}`,
    ),
);

/* ------------------------------------------------ finance: expense accounts */
server.registerTool(
  "list_expense_accounts",
  {
    description: "List finance expense accounts (general expense buckets).",
    inputSchema: {},
  },
  async () => text(await readCollection("expense-accounts")),
);

server.registerTool(
  "add_expense_account",
  {
    description: "Create an expense account (e.g. Software, Travel, Taxes).",
    inputSchema: {
      name: z.string(),
      color: z.string().optional().describe("hex color"),
    },
  },
  async (a) => {
    const record: ExpenseAccount = {
      id: newId(),
      name: a.name,
      color: a.color,
    };
    await upsert("expense-accounts", record);
    return text({ added: record });
  },
);

server.registerTool(
  "delete_expense_account",
  {
    description:
      "Delete an expense account by id. Its expenses are kept but unfiled.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const expenses = await readCollection("finance-expenses");
    for (const e of expenses) {
      if (e.accountId === id) {
        await upsert("finance-expenses", { ...e, accountId: undefined });
      }
    }
    return text(
      (await remove("expense-accounts", id))
        ? `Deleted ${id}`
        : `No account ${id}`,
    );
  },
);

/* ------------------------------------------------------- finance: expenses */
server.registerTool(
  "list_finance_expenses",
  {
    description:
      "List work/finance expenses (distinct from the personal Budget). Optionally filter by projectId or accountId.",
    inputSchema: {
      projectId: z.string().optional(),
      accountId: z.string().optional(),
    },
  },
  async (a) => {
    let items = await readCollection("finance-expenses");
    if (a.projectId) items = items.filter((e) => e.projectId === a.projectId);
    if (a.accountId) items = items.filter((e) => e.accountId === a.accountId);
    return text(items);
  },
);

server.registerTool(
  "add_finance_expense",
  {
    description:
      "Log a work expense. Link to a project (projectId, counts toward its P&L) and/or file under an account (accountId).",
    inputSchema: {
      amount: z.number(),
      date: z.string().optional().describe("ISO yyyy-mm-dd, default today"),
      vendor: z.string().optional(),
      description: z.string().optional(),
      currency: z.string().optional().describe("ISO code, default USD"),
      accountId: z.string().optional(),
      projectId: z.string().optional(),
      channel: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: FinanceExpense = {
      id: newId(),
      date: a.date ?? todayISO(),
      amount: a.amount,
      vendor: a.vendor,
      description: a.description,
      currency: a.currency ?? "USD",
      accountId: a.accountId,
      projectId: a.projectId,
      channel: a.channel,
      notes: a.notes,
    };
    await upsert("finance-expenses", record);
    return text({ added: record });
  },
);

server.registerTool(
  "update_finance_expense",
  {
    description: "Update a finance expense by id. Only provided fields change.",
    inputSchema: {
      id: z.string(),
      amount: z.number().optional(),
      date: z.string().optional(),
      vendor: z.string().optional(),
      description: z.string().optional(),
      currency: z.string().optional(),
      accountId: z.string().optional(),
      projectId: z.string().optional(),
      channel: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const cur = (await readCollection("finance-expenses")).find(
      (e) => e.id === id,
    );
    if (!cur) return text(`No finance expense with id ${id}`);
    const next = { ...cur, ...defined(patch) };
    await upsert("finance-expenses", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "delete_finance_expense",
  {
    description: "Delete a finance expense by id.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) =>
    text(
      (await remove("finance-expenses", id)) ? `Deleted ${id}` : `No expense ${id}`,
    ),
);

server.registerTool(
  "get_project_finance",
  {
    description:
      "Profit/loss for a project: received (paid), outstanding, drafted, linked expenses, and net (received − expenses).",
    inputSchema: { projectId: z.string() },
  },
  async ({ projectId }) => {
    const [invoices, expenses] = await Promise.all([
      readCollection("invoices"),
      readCollection("finance-expenses"),
    ]);
    return text(projectPnl(projectId, invoices, expenses));
  },
);

server.registerTool(
  "get_finance_summary",
  {
    description:
      "Overall finance summary: received, outstanding, total expenses, and net profit.",
    inputSchema: {},
  },
  async () => {
    const [invoices, expenses] = await Promise.all([
      readCollection("invoices"),
      readCollection("finance-expenses"),
    ]);
    return text(financeSummary(invoices, expenses));
  },
);

/* ---------------------------------------------------------------- templates */
server.registerTool(
  "list_templates",
  { description: "List project templates.", inputSchema: {} },
  async () => {
    const templates = await readCollection("templates");
    return text(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        sidework: t.sidework,
        milestones: t.milestones.length,
        tasks: t.tasks.length,
        durationDays: t.durationDays,
      })),
    );
  },
);

server.registerTool(
  "create_project_from_template",
  {
    description:
      "Create a new project from a template, anchored to a start date (defaults to today). Optionally override the name.",
    inputSchema: {
      templateId: z.string(),
      startDate: z.string().optional().describe("ISO yyyy-mm-dd, default today"),
      name: z.string().optional(),
    },
  },
  async ({ templateId, startDate, name }) => {
    const tpl = (await readCollection("templates")).find(
      (t) => t.id === templateId,
    );
    if (!tpl) return text(`No template with id ${templateId}`);
    const project = instantiateTemplate(tpl, startDate ?? todayISO());
    if (name) project.name = name;
    await upsert("projects", project);
    return text({
      created: {
        id: project.id,
        name: project.name,
        tasks: project.tasks.length,
        milestones: project.milestones.length,
      },
    });
  },
);

/* -------------------------------------------------------------------- budget */
server.registerTool(
  "list_budget_categories",
  { description: "List personal budget categories with monthly limits.", inputSchema: {} },
  async () => text(await readCollection("budget-categories")),
);

server.registerTool(
  "add_budget_category",
  {
    description: "Add a budget category with a monthly spending limit.",
    inputSchema: {
      name: z.string(),
      monthlyLimit: z.number(),
      color: z.string().optional().describe("hex, e.g. #818cf8"),
    },
  },
  async (a) => {
    const record: BudgetCategory = {
      id: newId(),
      name: a.name,
      monthlyLimit: a.monthlyLimit,
      color: a.color,
    };
    await upsert("budget-categories", record);
    return text({ added: record });
  },
);

server.registerTool(
  "list_expenses",
  {
    description: "List expenses, optionally filtered to a month (YYYY-MM).",
    inputSchema: { month: z.string().optional().describe("YYYY-MM") },
  },
  async ({ month }) => {
    const all = await readCollection("expenses");
    return text(month ? budget.expensesInMonth(all, month) : all);
  },
);

server.registerTool(
  "add_expense",
  {
    description:
      "Log an expense. categoryId must match a budget category (see list_budget_categories); omit for uncategorized.",
    inputSchema: {
      amount: z.number(),
      date: z.string().optional().describe("ISO yyyy-mm-dd, default today"),
      categoryId: z.string().optional(),
      note: z.string().optional(),
    },
  },
  async (a) => {
    const record: Expense = {
      id: newId(),
      amount: a.amount,
      date: a.date ?? todayISO(),
      categoryId: a.categoryId,
      note: a.note,
    };
    await upsert("expenses", record);
    return text({ added: record });
  },
);

server.registerTool(
  "delete_expense",
  { description: "Delete an expense by id.", inputSchema: { id: z.string() } },
  async ({ id }) =>
    text((await remove("expenses", id)) ? `Deleted ${id}` : `No expense ${id}`),
);

server.registerTool(
  "get_budget",
  {
    description:
      "Budget summary for a month (default current): per-category spent vs limit, totals, and uncategorized.",
    inputSchema: { month: z.string().optional().describe("YYYY-MM") },
  },
  async ({ month }) => {
    const ym = month ?? todayISO().slice(0, 7);
    const [categories, expenses] = await Promise.all([
      readCollection("budget-categories"),
      readCollection("expenses"),
    ]);
    const monthExp = budget.expensesInMonth(expenses, ym);
    const byCat = budget.spentByCategory(monthExp);
    return text({
      month: ym,
      totalSpent: budget.sumExpenses(monthExp),
      totalBudgeted: categories.reduce((s, c) => s + c.monthlyLimit, 0),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        limit: c.monthlyLimit,
        spent: byCat[c.id] ?? 0,
        over: (byCat[c.id] ?? 0) > c.monthlyLimit,
      })),
      uncategorized: byCat["__none"] ?? 0,
    });
  },
);

/* ------------------------------------------------------------------- clients */
async function getClient(id: string): Promise<Client | null> {
  return (await readCollection("clients")).find((c) => c.id === id) ?? null;
}

server.registerTool(
  "list_clients",
  { description: "List CRM clients (leads, active, past) under side work.", inputSchema: {} },
  async () => text(await readCollection("clients")),
);

server.registerTool(
  "add_client",
  {
    description: "Add a CRM client. status: lead | active | past (default lead).",
    inputSchema: {
      name: z.string(),
      status: en(T.CLIENT_STATUSES).optional(),
      contact: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      nextFollowUp: z.string().optional().describe("ISO yyyy-mm-dd"),
      lastContact: z.string().optional().describe("ISO yyyy-mm-dd"),
      notes: z.string().optional(),
    },
  },
  async (a) => {
    const record: Client = {
      id: newId(),
      name: a.name,
      status: a.status ?? "lead",
      contact: a.contact,
      email: a.email,
      phone: a.phone,
      nextFollowUp: a.nextFollowUp,
      lastContact: a.lastContact,
      notes: a.notes,
      interactions: [],
    };
    await upsert("clients", record);
    return text({ added: record });
  },
);

server.registerTool(
  "update_client",
  {
    description: "Update a client by id. Only provided fields change.",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      status: en(T.CLIENT_STATUSES).optional(),
      contact: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      nextFollowUp: z.string().optional(),
      lastContact: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    const cur = await getClient(id);
    if (!cur) return text(`No client with id ${id}`);
    const next = { ...cur, ...defined(patch) };
    await upsert("clients", next);
    return text({ updated: next });
  },
);

server.registerTool(
  "log_client_interaction",
  {
    description:
      "Log an interaction (note/call/email/meeting) on a client's timeline; also updates lastContact.",
    inputSchema: {
      clientId: z.string(),
      summary: z.string(),
      type: en(T.INTERACTION_TYPES).optional(),
      date: z.string().optional().describe("ISO yyyy-mm-dd, default today"),
    },
  },
  async (a) => {
    const c = await getClient(a.clientId);
    if (!c) return text(`No client with id ${a.clientId}`);
    const entry: Interaction = {
      id: newId(),
      date: a.date ?? todayISO(),
      type: a.type ?? "note",
      summary: a.summary,
    };
    await upsert("clients", {
      ...c,
      interactions: [entry, ...c.interactions],
      lastContact: entry.date,
    });
    return text({ logged: entry, onClient: c.name });
  },
);

server.registerTool(
  "delete_client",
  { description: "Delete a client by id.", inputSchema: { id: z.string() } },
  async ({ id }) =>
    text((await remove("clients", id)) ? `Deleted ${id}` : `No client ${id}`),
);

/* ------------------------------------------------------------------- connect */
await server.connect(new StdioServerTransport());
