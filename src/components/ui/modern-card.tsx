import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const modernCardVariants = cva(
  "relative overflow-hidden bg-card border transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border shadow-lg",
        premium: "border-border/20 shadow-xl shadow-muted-foreground/15 hover:shadow-2xl hover:shadow-muted-foreground/20 hover:scale-[1.02]",
        interactive: "border-border cursor-pointer hover:border-primary/50 hover:shadow-md",
        selection: "border-border cursor-pointer hover:border-primary data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
      },
      size: {
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface ModernCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modernCardVariants> {}

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(modernCardVariants({ variant, size, className }))}
      {...props}
    />
  )
);
ModernCard.displayName = "ModernCard";

const modernCardHeaderVariants = cva("flex flex-col space-y-1.5 p-6", {
  variants: {
    variant: {
      default: "",
      gradient: "bg-gradient-to-r from-primary/5 via-transparent to-secondary/5",
      accent: "border-b border-border/50 bg-muted/30",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface ModernCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modernCardHeaderVariants> {}

const ModernCardHeader = React.forwardRef<HTMLDivElement, ModernCardHeaderProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(modernCardHeaderVariants({ variant, className }))}
      {...props}
    />
  )
);
ModernCardHeader.displayName = "ModernCardHeader";

const modernCardContentVariants = cva("", {
  variants: {
    variant: {
      default: "p-6 pt-0",
      compact: "p-4 pt-0",
      spacious: "p-8 pt-0",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface ModernCardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modernCardContentVariants> {}

const ModernCardContent = React.forwardRef<HTMLDivElement, ModernCardContentProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(modernCardContentVariants({ variant, className }))}
      {...props}
    />
  )
);
ModernCardContent.displayName = "ModernCardContent";

export { ModernCard, ModernCardHeader, ModernCardContent };
