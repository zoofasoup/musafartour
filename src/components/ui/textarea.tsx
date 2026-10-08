import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[84px] w-full rounded-md border border-field-border bg-field px-3 py-2 text-base text-foreground ring-offset-background placeholder:text-muted-foreground hover:bg-field-hover focus-visible:outline-none focus-visible:border-foreground focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0 aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-status-bad-bg disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
