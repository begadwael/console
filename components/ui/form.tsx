import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-lg border border-border-strong bg-bg-elevated px-3 py-2.5 text-sm text-text placeholder:text-text-faint transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function Field({
  label,
  children,
  hint,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
        {label}
        {required ? <span className="text-accent">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-text-faint">{hint}</span> : null}
    </label>
  );
}

export function Input({
  ref,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return <input ref={ref} {...props} className={cn(fieldClasses, className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(fieldClasses, "min-h-[72px] resize-y", props.className)}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(fieldClasses, "cursor-pointer appearance-none pr-8", props.className)}
    />
  );
}

// Segmented control — nicer than a <select> for short, visible option sets.
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; color?: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border-strong bg-bg-elevated p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-surface-active text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            {opt.color ? (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: active ? opt.color : "var(--text-faint)" }}
              />
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
