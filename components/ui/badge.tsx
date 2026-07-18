import { cn } from "@/lib/cn";

type Variant = "default" | "muted" | "danger" | "warning" | "success" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground border-transparent",
  muted: "bg-muted text-muted-foreground border-transparent",
  danger: "bg-danger/10 text-danger border-danger/25",
  warning: "bg-warning/10 text-warning border-warning/30",
  success: "bg-success/10 text-success border-success/25",
  outline: "bg-transparent text-foreground border-border",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
