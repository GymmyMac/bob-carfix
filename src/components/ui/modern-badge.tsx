import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const modernBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        secondary: "border-border/50 bg-muted text-muted-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground bg-transparent",
        success: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
        warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        spec: "border-border/20 bg-muted/50 text-muted-foreground",
        difference: "border-primary/30 bg-primary/10 text-primary font-semibold",
        compatible: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
        premium: "border-accent/30 bg-gradient-to-r from-accent/10 to-amber-500/10 text-accent-foreground",
        rating: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface ModernBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modernBadgeVariants> {
  icon?: React.ReactNode;
}

const ModernBadge = React.forwardRef<HTMLDivElement, ModernBadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(modernBadgeVariants({ variant, size, className }))}
      {...props}
    >
      {icon}
      {children}
    </div>
  )
);
ModernBadge.displayName = "ModernBadge";

export { ModernBadge, modernBadgeVariants };
