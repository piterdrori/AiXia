import type { ReactNode } from "react";
import { X } from "lucide-react";

import { AixiaButton } from "./AixiaButton";

type AixiaModalProps = {
  open: boolean;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
};

export function AixiaModal({
  open,
  title,
  description,
  badge,
  children,
  footer,
  onClose,
  maxWidthClassName = "max-w-6xl",
}: AixiaModalProps) {
  if (!open) return null;

  return (
    <div className="aixia-modal-backdrop">
      <div className={`aixia-modal ${maxWidthClassName}`}>
        <div className="aixia-modal-header">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#6366F1]/20 blur-[80px]" />
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#A855F7]/20 blur-[80px]" />
            <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-[#FBBF24]/10 blur-[80px]" />
          </div>

          <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              {badge ? (
                <div
                  className="aixia-action-system"
                  data-align="start"
                  data-density="compact"
                >
                  {badge}
                </div>
              ) : null}

              <h2 className="mt-5 text-[clamp(1.75rem,3vw,2.25rem)] font-black leading-tight tracking-tight text-white">
                {title}
              </h2>

              {description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                  {description}
                </p>
              ) : null}
            </div>

            <AixiaButton
              type="button"
              variant="icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </AixiaButton>
          </div>
        </div>

        <div className="aixia-modal-body">{children}</div>

        {footer ? <div className="aixia-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
