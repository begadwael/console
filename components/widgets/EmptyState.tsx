import { Icons, type LucideIcon } from "@/components/ui/icons";

export function EmptyState({
  icon: Icon = Icons.todo,
  message,
  action,
}: {
  icon?: LucideIcon;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-9 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-faint">
        <Icon size={18} />
      </span>
      <p className="text-sm text-text-muted">{message}</p>
      {action}
    </div>
  );
}
