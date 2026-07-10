import type { ReactNode } from "react";

type AgentOpsAdvancedDisclosureProps = {
  title?: string;
  children: ReactNode;
};

export function AgentOpsAdvancedDisclosure({
  title = "Advanced details",
  children,
}: AgentOpsAdvancedDisclosureProps) {
  return (
    <details className="rounded-xl border border-white/10 bg-black/20">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/75 hover:text-white">
        {title}
      </summary>
      <div className="border-t border-white/10 px-4 py-4">{children}</div>
    </details>
  );
}
