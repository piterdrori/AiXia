import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { AixiaButton } from "./AixiaButton";

export type AixiaRowActionMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "secondary" | "danger";
};

type AixiaRowActionMenuProps = {
  items: AixiaRowActionMenuItem[];
  disabled?: boolean;
  align?: "start" | "center" | "end";
  triggerLabel?: string;
  triggerClassName?: string;
  contentClassName?: string;
  sideOffset?: number;
};

export function AixiaRowActionMenu({
  items,
  disabled = false,
  align = "end",
  triggerLabel = "More actions",
  triggerClassName = "",
  contentClassName = "",
  sideOffset = 6,
}: AixiaRowActionMenuProps) {
  const visibleItems = items.filter((item) => Boolean(item));
  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AixiaButton
          type="button"
          variant="secondary"
          title={triggerLabel}
          aria-label={triggerLabel}
          disabled={disabled}
          className={`aixia-row-action-menu-trigger ${triggerClassName}`.trim()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">{triggerLabel}</span>
        </AixiaButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        className={`aixia-row-action-menu-content ${contentClassName}`.trim()}
      >
        {visibleItems.map((item) => (
          <DropdownMenuItem
            key={item.key}
            disabled={disabled || item.disabled}
            variant={item.tone === "danger" ? "destructive" : "default"}
            className="aixia-row-action-menu-item"
            onClick={item.onSelect}
          >
            {item.icon}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
