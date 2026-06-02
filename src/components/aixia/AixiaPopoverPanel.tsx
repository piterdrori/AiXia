"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { PopoverContent } from "@/components/ui/popover";

type AixiaPopoverPanelProps = ComponentProps<typeof PopoverContent> & {
  compact?: boolean;
};

export function AixiaPopoverPanel({
  className,
  compact = false,
  ...props
}: AixiaPopoverPanelProps) {
  return (
    <PopoverContent
      className={cn(
        "aixia-popover-panel aixia-dash-panel aixia-dash-glass border-0 p-0 shadow-xl",
        compact ? "aixia-popover-panel--compact" : "",
        className
      )}
      {...props}
    />
  );
}
