import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-fill text-[#04122e] hover:bg-accent-strong hover:text-white font-semibold border border-transparent shadow-[0_2px_12px_-4px] shadow-accent/40",
  secondary:
    "bg-surface border border-border-strong text-text hover:bg-surface-hover active:bg-surface-active",
  ghost:
    "text-text-muted hover:text-text hover:bg-surface-hover border border-transparent",
  danger:
    "text-danger hover:bg-danger/10 border border-transparent active:bg-danger/15",
};

const SIZES: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-3.5 py-2 rounded-lg gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center cursor-pointer select-none",
        "transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        "[&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
