import type { ReactNode } from "react";
import { FileText } from "lucide-react";

import { AixiaActionSystem } from "./AixiaActionSystem";
import { AixiaStatusBadge } from "./AixiaStatusBadge";
import type { AixiaMessengerAttachment } from "./AixiaMessengerConfig";

export type AixiaChatMessageSenderType = "user" | "agent" | "system";

export type AixiaChatMessageProps = {
  senderName: string;
  senderRole?: string;
  senderType?: AixiaChatMessageSenderType;
  avatarInitials?: string;
  timestamp?: string;
  status?: ReactNode;
  badges?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  attachments?: AixiaMessengerAttachment[];
  compact?: boolean;
  planned?: boolean;
  className?: string;
};

function getInitials(senderName: string) {
  const parts = senderName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "AI";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function AixiaChatMessage({
  senderName,
  senderRole,
  senderType = "agent",
  avatarInitials,
  timestamp,
  status,
  badges,
  children,
  footer,
  metadata,
  actions,
  attachments = [],
  compact = false,
  planned = false,
  className = "",
}: AixiaChatMessageProps) {
  const messageClassName = [
    "aixia-chat-message",
    `aixia-chat-message--${senderType}`,
    senderType === "user" ? "aixia-chat-message--align-end" : "",
    compact ? "aixia-chat-message--compact" : "",
    planned ? "aixia-chat-message--planned" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const footerContent = footer ?? metadata;

  return (
    <article className={messageClassName}>
      <div className="aixia-chat-message__avatar">
        {avatarInitials || getInitials(senderName)}
      </div>

      <div className="aixia-chat-message__main">
        <div className="aixia-chat-message__meta">
          <div className="aixia-chat-message__meta-primary">
            <span className="aixia-chat-message__sender">{senderName}</span>
            {senderRole ? (
              <span className="aixia-chat-message__sender-role">{senderRole}</span>
            ) : null}
            {timestamp ? (
              <span className="aixia-chat-message__timestamp">{timestamp}</span>
            ) : null}
          </div>
          <div className="aixia-chat-message__meta-trailing">
            {badges ? <div className="aixia-chat-message__badges">{badges}</div> : null}
            {planned && !status ? (
              <AixiaStatusBadge value="pending" className="aixia-chat-message__status" />
            ) : status ? (
              <span className="aixia-chat-message__status">{status}</span>
            ) : null}
          </div>
        </div>

        <div className="aixia-chat-message__bubble">
          {children}
          {attachments.length > 0 ? (
            <div className="aixia-chat-message__attachments">
              {attachments.map((attachment) =>
                attachment.previewUrl && attachment.fileType.startsWith("image/") ? (
                  <a
                    key={attachment.id}
                    href={attachment.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="aixia-chat-message__attachment-image"
                  >
                    <img src={attachment.previewUrl} alt={attachment.fileName} />
                  </a>
                ) : (
                  <span key={attachment.id} className="aixia-chat-message__attachment-chip">
                    <FileText className="h-3.5 w-3.5" />
                    {attachment.fileName}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </div>

        {footerContent ? (
          <div className="aixia-chat-message__footer">{footerContent}</div>
        ) : null}

        {actions ? (
          <AixiaActionSystem
            align="start"
            density={compact ? "compact" : "normal"}
            className="aixia-chat-message__actions"
          >
            {actions}
          </AixiaActionSystem>
        ) : null}
      </div>
    </article>
  );
}
