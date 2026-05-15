import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type AixiaAlertTone = "success" | "error" | "info";

type AixiaAlertProps = {
  tone?: AixiaAlertTone;
  children: ReactNode;
  className?: string;
};

function getToneClass(tone: AixiaAlertTone) {
  if (tone === "success") return "aixia-alert-success";
  if (tone === "error") return "aixia-alert-error";
  return "aixia-alert-info";
}

function getIcon(tone: AixiaAlertTone) {
  if (tone === "success") return CheckCircle2;
  if (tone === "error") return AlertTriangle;
  return Info;
}

export function AixiaAlert({
  tone = "info",
  children,
  className = "",
}: AixiaAlertProps) {
  const Icon = getIcon(tone);

  return (
    <div className={`aixia-alert ${getToneClass(tone)} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
