import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

import { AixiaInfoBlock } from "./AixiaInfoBlock";
import { AixiaSection } from "./AixiaSection";

type AixiaAccessRuleProps = {
  title?: string;
  description: string;
  children: ReactNode;
  icon?: LucideIcon;
};

export function AixiaAccessRule({
  title = "Locked Access Rule",
  description,
  children,
  icon: Icon = ShieldCheck,
}: AixiaAccessRuleProps) {
  return (
    <AixiaSection title={title} description={description} icon={Icon}>
      <AixiaInfoBlock tone="cyan" icon={Icon}>
        {children}
      </AixiaInfoBlock>
    </AixiaSection>
  );
}
