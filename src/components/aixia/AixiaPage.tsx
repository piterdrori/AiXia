import type { ReactNode } from "react";

type AixiaPageProps = {
  children: ReactNode;
  className?: string;
};

export function AixiaPage({ children, className = "" }: AixiaPageProps) {
  return (
    <div className={`aixia-page ${className}`}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[8%] top-[8%] h-[520px] w-[520px] rounded-full bg-[#6366F1]/20 blur-[90px]" />
        <div className="absolute left-[68%] top-[58%] h-[620px] w-[620px] rounded-full bg-[#A855F7]/20 blur-[100px]" />
        <div className="absolute left-[78%] top-[28%] h-[420px] w-[420px] rounded-full bg-[#FBBF24]/10 blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,0.08),transparent_22%),radial-gradient(circle_at_90%_80%,rgba(168,85,247,0.08),transparent_22%)]" />
      </div>

      <div className="aixia-shell">{children}</div>
    </div>
  );
}
