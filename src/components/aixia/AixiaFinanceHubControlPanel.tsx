import type { LucideIcon } from "lucide-react";

import { AixiaNavigationInfoPanel } from "./AixiaNavigationCard";
import type { AixiaCommandTone } from "./commandSurface";

type AixiaFinanceHubControlPanelProps = {
  title?: string;
  description?: string;
  icon: LucideIcon;
  tone?: AixiaCommandTone;
  className?: string;
};

export function AixiaFinanceHubControlPanel({
  title = "Control Signals",
  description = "Live finance risks and operating blockers visible to this user.",
  icon,
  tone = "amber",
  className = "",
}: AixiaFinanceHubControlPanelProps) {
  return (
    <AixiaNavigationInfoPanel
      tone={tone}
      icon={icon}
      title={title}
      description={description}
      className={className}
    />
  );
}
