import type { CSSProperties, ReactNode } from "react";
import { Loader2, MessageSquareText } from "lucide-react";

import { AixiaEmptyState } from "./AixiaEmptyState";

export type AixiaChatThreadVariant = "standard" | "workbench" | "messenger";

export type AixiaChatThreadDensity = "comfortable" | "compact";

export type AixiaChatThreadProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  maxHeight?: string;
  variant?: AixiaChatThreadVariant;
  /** Compact workbench: shorter viewport, lighter shell, content-first height. */
  density?: AixiaChatThreadDensity;
  className?: string;
  bodyClassName?: string;
};

export function AixiaChatThread({
  title,
  description,
  actions,
  children,
  footer,
  emptyTitle = "No messages yet",
  emptyDescription = "Start a conversation when you are ready.",
  isLoading = false,
  maxHeight,
  variant = "standard",
  density = "comfortable",
  className = "",
  bodyClassName = "",
}: AixiaChatThreadProps) {
  const isCompact = density === "compact";
  const isMessenger = variant === "messenger";
  const resolvedMaxHeight =
    maxHeight ?? (isMessenger ? "min(62vh, 720px)" : isCompact ? "min(280px, 42vh)" : "560px");

  const threadClassName = [
    "aixia-chat-thread",
    variant === "workbench" ? "aixia-chat-thread--workbench" : "",
    isMessenger ? "aixia-chat-thread--messenger" : "",
    isCompact ? "aixia-chat-thread--density-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const threadBodyClassName = ["aixia-chat-thread__body", bodyClassName]
    .filter(Boolean)
    .join(" ");

  const bodyStyle: CSSProperties = {
    maxHeight: resolvedMaxHeight,
  };

  const hasMessages = Boolean(children);

  return (
    <section className={threadClassName}>
      {title || description || actions ? (
        <header className="aixia-chat-thread__header">
          <div className="aixia-chat-thread__header-copy">
            {title ? <h3 className="aixia-chat-thread__title">{title}</h3> : null}
            {description ? (
              <p className="aixia-chat-thread__description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="aixia-chat-thread__header-actions">{actions}</div> : null}
        </header>
      ) : null}

      <div className="aixia-chat-thread__viewport">
        <div className={threadBodyClassName} style={bodyStyle}>
          {isLoading ? (
            <div className="aixia-chat-thread__loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading conversation...</span>
            </div>
          ) : hasMessages ? (
            <div className="aixia-chat-thread__messages">{children}</div>
          ) : (
            <AixiaEmptyState
              icon={MessageSquareText}
              title={emptyTitle}
              description={emptyDescription}
              className="aixia-chat-thread__empty"
            />
          )}
        </div>
      </div>

      {footer ? (
        <div className="aixia-chat-thread__footer">
          <div className="aixia-chat-thread__composer-dock">{footer}</div>
        </div>
      ) : null}
    </section>
  );
}
