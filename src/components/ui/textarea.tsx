import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground backdrop-blur-md transition-all duration-200 outline-none",
        "placeholder:text-muted-foreground",
        "focus:border-ring focus:ring-[3px] focus:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none selection:bg-primary selection:text-primary-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
