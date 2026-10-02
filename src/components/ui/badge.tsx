import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status: pastel with an icon and text, never colour alone (DESIGN.md). Height 24, radius 6.
        ok: "rounded-sm border-transparent bg-status-ok-bg text-status-ok-fg",
        info: "rounded-sm border-transparent bg-status-info-bg text-status-info-fg",
        warn: "rounded-sm border-transparent bg-status-warn-bg text-status-warn-fg",
        over: "rounded-sm border-transparent bg-status-over-bg text-status-over-fg",
        bad: "rounded-sm border-transparent bg-status-bad-bg text-status-bad-fg",
        mute: "rounded-sm border-transparent bg-muted text-muted-foreground",
        brand: "rounded-[4px] border-transparent bg-brand text-brand-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
