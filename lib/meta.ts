// Shared display metadata (labels + colors) for statuses and modules.
// No server-only imports here — safe to use in client components.
// Icons live in components/ui/icons.tsx (Lucide), not here.

import type {
  JobStatus,
  TaskStatus,
  Priority,
  PersonalType,
  ProjectStatus,
  ProjectTaskStatus,
  InvoiceStatus,
  InvoiceCadence,
  PaymentChannel,
  ClientStatus,
} from "./types";

export const MODULE = {
  jobs: { label: "Job search", color: "var(--jobs)", href: "/jobs" },
  sidework: { label: "Side work", color: "var(--sidework)", href: "/sidework" },
  projects: { label: "Projects", color: "var(--projects)", href: "/projects" },
  income: { label: "Income", color: "var(--income)", href: "/sidework/finance" },
  finance: { label: "Finance", color: "var(--income)", href: "/sidework/finance" },
  budget: { label: "Budget", color: "var(--budget)", href: "/budget" },
  "part-time": {
    label: "Part-time",
    color: "var(--parttime)",
    href: "/part-time",
  },
  personal: { label: "Personal", color: "var(--personal)", href: "/personal" },
} as const;

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "#8b97ad" },
  sent: { label: "Sent", color: "#5b9dff" },
  paid: { label: "Paid", color: "#34d399" },
};

export const INVOICE_CADENCE_META: Record<
  InvoiceCadence,
  { label: string; adjective: string }
> = {
  weekly: { label: "Weekly", adjective: "/week" },
  monthly: { label: "Monthly", adjective: "/month" },
  quarterly: { label: "Quarterly", adjective: "/quarter" },
  yearly: { label: "Yearly", adjective: "/year" },
};

// Payment channels — label + icon key (from components/ui/icons). The icon key
// is referenced loosely so adding free-form channels never breaks the build.
export const PAYMENT_CHANNEL_META: Record<
  PaymentChannel,
  { label: string; icon: string }
> = {
  bank: { label: "Bank transfer", icon: "bank" },
  wise: { label: "Wise", icon: "send" },
  paypal: { label: "PayPal", icon: "wallet" },
  stripe: { label: "Stripe", icon: "card" },
  cash: { label: "Cash", icon: "wallet" },
  cheque: { label: "Cheque", icon: "doc" },
  crypto: { label: "Crypto", icon: "coins" },
  other: { label: "Other", icon: "wallet" },
};

// Resolve a (possibly free-form) channel string to a display label.
export function channelLabel(channel?: string): string | null {
  if (!channel) return null;
  return (
    PAYMENT_CHANNEL_META[channel as PaymentChannel]?.label ?? channel
  );
}

// Palette cycled through when creating new expense accounts that don't pick a
// color. Mirrors the status/module hues so the app reads as one set.
export const ACCOUNT_PALETTE = [
  "#5b9dff",
  "#a371f7",
  "#f5b455",
  "#f4717b",
  "#56d364",
  "#34d399",
  "#8b97ad",
  "#e879a6",
] as const;

export function accountColor(i: number): string {
  return ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length];
}

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  active: { label: "Active", color: "#56d364" },
  paused: { label: "Paused", color: "#f5b455" },
  done: { label: "Done", color: "#8b97ad" },
};

export const PROJECT_TASK_STATUS_META: Record<
  ProjectTaskStatus,
  { label: string; color: string }
> = {
  todo: { label: "To do", color: "#8b97ad" },
  in_progress: { label: "In progress", color: "#5b9dff" },
  blocked: { label: "Blocked", color: "#f4717b" },
  done: { label: "Done", color: "#56d364" },
};

export const JOB_STATUS_META: Record<
  JobStatus,
  { label: string; color: string }
> = {
  saved: { label: "Saved", color: "#8b97ad" },
  applied: { label: "Applied", color: "#5b9dff" },
  interviewing: { label: "Interviewing", color: "#f5b455" },
  offer: { label: "Offer", color: "#56d364" },
  rejected: { label: "Rejected", color: "#f4717b" },
};

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; color: string }
> = {
  todo: { label: "To do", color: "#8b97ad" },
  doing: { label: "In progress", color: "#5b9dff" },
  done: { label: "Done", color: "#56d364" },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> =
  {
    low: { label: "Low", color: "#8b97ad" },
    medium: { label: "Medium", color: "#f5b455" },
    high: { label: "High", color: "#f4717b" },
  };

export const PERSONAL_TYPE_META: Record<
  PersonalType,
  { label: string; color: string }
> = {
  habit: { label: "Habit", color: "#34d3b4" },
  goal: { label: "Goal", color: "#f5b455" },
  todo: { label: "To-do", color: "#5b9dff" },
};

export const CLIENT_STATUS_META: Record<
  ClientStatus,
  { label: string; color: string }
> = {
  lead: { label: "Lead", color: "#f5b455" },
  active: { label: "Active", color: "#56d364" },
  past: { label: "Past", color: "#8b97ad" },
};
