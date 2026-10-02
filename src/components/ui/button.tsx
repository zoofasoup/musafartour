import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action in the work areas (agent, admin). Public pages use `brand`.
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        // Primary action on the public site (DESIGN.md): crimson.
        brand: "bg-brand text-brand-foreground hover:bg-brand-press",
        outline: "border border-input bg-card text-foreground hover:bg-field",
        secondary: "bg-field text-foreground hover:bg-field-hover",
        ghost: "text-foreground hover:bg-field",
        // A destructive action in a row or panel is outlined; only the last confirmation step is solid.
        destructive: "border border-destructive/45 bg-transparent text-destructive hover:bg-status-bad-bg",
        destructiveSolid: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto p-0 text-foreground underline underline-offset-4 hover:opacity-80",
      },
      size: {
        default: "h-10 px-4 [@media(pointer:coarse)]:h-11",
        sm: "h-8 px-3 text-[13px] [@media(pointer:coarse)]:h-11",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
