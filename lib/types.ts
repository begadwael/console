// Domain types for each dashboard module.
// Every record has a string `id`; collections are stored as JSON arrays.

export type ID = string;

// ---- Job search ----
export const JOB_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface Job {
  id: ID;
  company: string;
  role: string;
  status: JobStatus;
  appliedDate?: string; // ISO yyyy-mm-dd
  nextAction?: string;
  nextActionDate?: string; // ISO yyyy-mm-dd
  link?: string;
  notes?: string;
}

// ---- Side work ----
export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface SideWorkTask {
  id: ID;
  title: string;
  client?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string; // ISO yyyy-mm-dd
  notes?: string;
}

// ---- Part-time work ----
export interface PartTimeEntry {
  id: ID;
  date: string; // ISO yyyy-mm-dd
  task: string;
  hours: number;
  done: boolean;
  notes?: string;
}

// ---- Personal & habits ----
export const PERSONAL_TYPES = ["habit", "goal", "todo"] as const;
export type PersonalType = (typeof PERSONAL_TYPES)[number];

export interface PersonalItem {
  id: ID;
  type: PersonalType;
  title: string;
  cadence?: string; // e.g. "daily", "3x / week" (habits)
  streak?: number; // current streak count (habits)
  lastDone?: string; // ISO yyyy-mm-dd
  done?: boolean; // for goals/todos
  notes?: string;
}

// ---- Projects ----
export const PROJECT_STATUSES = ["active", "paused", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// A dated point on the project timeline.
export interface Milestone {
  id: ID;
  title: string;
  date?: string; // ISO yyyy-mm-dd
  done: boolean;
}

// ---- Project task management (Kanban) ----
export const PROJECT_TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
] as const;
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

// A checklist item within a task.
export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

// A unit of work on the project board.
export interface ProjectTask {
  id: ID;
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  priority: Priority;
  dueDate?: string; // ISO yyyy-mm-dd
  subtasks: Subtask[];
}

// A project document — either an external link or a file stored on disk.
export const DOC_KINDS = ["link", "file"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export interface ProjectDoc {
  id: ID;
  title: string;
  kind: DocKind;
  note?: string;
  url?: string; // kind === "link"
  fileName?: string; // kind === "file" — original filename
  path?: string; // kind === "file" — relative path under data/uploads
  size?: number; // kind === "file" — bytes
}

export interface Project {
  id: ID;
  name: string;
  description?: string;
  status: ProjectStatus;
  sidework: boolean; // linked to Side work
  client?: string;
  color?: string; // optional per-project accent (CSS color)
  startDate?: string; // ISO yyyy-mm-dd
  dueDate?: string; // ISO yyyy-mm-dd
  createdAt: string; // ISO timestamp
  milestones: Milestone[];
  tasks: ProjectTask[];
  documents: ProjectDoc[];
}

// ---- Income & invoicing ----
export const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface Invoice {
  id: ID;
  client: string;
  title?: string;
  projectId?: string; // optional link to a project
  amount: number;
  currency?: string; // ISO code, default AED
  status: InvoiceStatus;
  issuedDate?: string; // ISO yyyy-mm-dd
  dueDate?: string; // ISO yyyy-mm-dd
  paidDate?: string; // ISO yyyy-mm-dd
  notes?: string;
}

// ---- Project templates ----
// Templates describe a project's structure with dates relative to the start
// (offsetDays), so they can be instantiated against any start date.
export interface TemplateMilestone {
  title: string;
  offsetDays?: number;
}
export interface TemplateTask {
  title: string;
  description?: string;
  priority?: Priority;
  subtasks?: string[];
  offsetDays?: number; // due = start + offsetDays
}
export interface TemplateDoc {
  title: string;
  url?: string;
}
export interface ProjectTemplate {
  id: ID;
  name: string;
  description?: string;
  sidework?: boolean;
  color?: string;
  durationDays?: number; // default project length (dueDate = start + duration)
  milestones: TemplateMilestone[];
  tasks: TemplateTask[];
  documents: TemplateDoc[];
  createdAt: string;
}

// ---- Personal budget ----
export interface BudgetCategory {
  id: ID;
  name: string;
  monthlyLimit: number;
  color?: string;
}

export interface Expense {
  id: ID;
  date: string; // ISO yyyy-mm-dd
  amount: number;
  categoryId?: string; // references a BudgetCategory; absent = uncategorized
  note?: string;
}

// ---- Clients (CRM, under side work) ----
export const CLIENT_STATUSES = ["lead", "active", "past"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const INTERACTION_TYPES = ["note", "call", "email", "meeting"] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

// A logged touchpoint with a client (the CRM activity timeline).
export interface Interaction {
  id: ID;
  date: string; // ISO yyyy-mm-dd
  type: InteractionType;
  summary: string;
}

export interface Client {
  id: ID;
  name: string; // company or person
  contact?: string; // primary contact person
  email?: string;
  phone?: string;
  status: ClientStatus;
  nextFollowUp?: string; // ISO yyyy-mm-dd
  lastContact?: string; // ISO yyyy-mm-dd
  notes?: string;
  interactions: Interaction[];
}

// Map of collection name -> record type, used by the store helpers.
export interface Collections {
  jobs: Job;
  sidework: SideWorkTask;
  "part-time": PartTimeEntry;
  personal: PersonalItem;
  projects: Project;
  invoices: Invoice;
  templates: ProjectTemplate;
  "budget-categories": BudgetCategory;
  expenses: Expense;
  clients: Client;
}
export type CollectionName = keyof Collections;
