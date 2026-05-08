import type { ReactNode } from "react";

type AixiaPageProps = {
  children: ReactNode;
  className?: string;
};

export function AixiaPage({ children, className = "" }: AixiaPageProps) {
  return (
    <div className={`aixia-page ${className}`}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[6%] top-[6%] h-[clamp(300px,36vw,560px)] w-[clamp(300px,36vw,560px)] rounded-full bg-[#6366F1]/20 blur-[90px]" />
        <div className="absolute left-[62%] top-[56%] h-[clamp(360px,42vw,680px)] w-[clamp(360px,42vw,680px)] rounded-full bg-[#A855F7]/18 blur-[110px]" />
        <div className="absolute left-[76%] top-[24%] h-[clamp(260px,30vw,460px)] w-[clamp(260px,30vw,460px)] rounded-full bg-[#FBBF24]/10 blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,0.08),transparent_22%),radial-gradient(circle_at_90%_80%,rgba(168,85,247,0.08),transparent_22%)]" />
      </div>

      <div className="aixia-shell">{children}</div>
    </div>
  );
}