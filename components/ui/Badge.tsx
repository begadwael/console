import { cn } from "@/lib/utils";

export function Badge({
  children,
  color,
  className,
  dot,
}: {
  children: React.ReactNode;
  color?: string; // CSS color for text + tinted bg/border
  className?: string;
  dot?: boolean; // show a leading status dot
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className,
      )}
      style={
        color
          ? {
              color,
              backgroundColor: `${color}1a`,
              border: `1px solid ${color}30`,
            }
          : undefined
      }
    >
      {dot && color ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {children}
    </span>
  );
}

// Small colored dot for status indicators.
export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
