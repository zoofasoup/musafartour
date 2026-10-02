import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-transparent bg-field px-3 py-2 text-base text-foreground ring-offset-background placeholder:text-muted-foreground/70 hover:bg-field-hover focus-visible:outline-none focus-visible:border-foreground focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0 aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-status-bad-bg disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors [@media(pointer:coarse)]:h-11 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
