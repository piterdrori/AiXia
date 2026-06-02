import { FileText, ImagePlus, X } from "lucide-react";

import { AixiaButton } from "./AixiaButton";
import type { AixiaMessengerAttachment } from "./AixiaMessengerConfig";

export type AixiaMessengerAttachmentSheetProps = {
  open: boolean;
  onClose: () => void;
  attachments: AixiaMessengerAttachment[];
  onPickFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  disabled?: boolean;
};

export function AixiaMessengerAttachmentSheet({
  open,
  onClose,
  attachments,
  onPickFiles,
  onRemoveAttachment,
  disabled = false,
}: AixiaMessengerAttachmentSheetProps) {
  if (!open) return null;

  return (
    <div className="aixia-messenger-attachment-sheet" data-testid="agentops-messenger-attachment-sheet">
      <div className="aixia-messenger-attachment-sheet__header">
        <p className="aixia-messenger-attachment-sheet__title">Add attachment</p>
        <AixiaButton type="button" variant="secondary" className="aixia-messenger-attachment-sheet__close" onClick={onClose}>
          <X className="h-4 w-4" />
        </AixiaButton>
      </div>

      <div className="aixia-messenger-attachment-sheet__actions">
        <label className="aixia-messenger-attachment-sheet__pick">
          <ImagePlus className="h-4 w-4" />
          <span>Image or file</span>
          <input
            type="file"
            accept="image/*,.pdf,.txt,.md,.json,.csv"
            multiple
            disabled={disabled}
            onChange={(event) => {
              if (event.target.files?.length) onPickFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {attachments.length > 0 ? (
        <ul className="aixia-messenger-attachment-sheet__queue">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="aixia-messenger-attachment-sheet__item">
              <FileText className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="truncate">{attachment.fileName}</p>
                {attachment.uploading ? <p className="text-xs opacity-70">Uploading…</p> : null}
                {attachment.error ? <p className="text-xs text-rose-300">{attachment.error}</p> : null}
              </div>
              <AixiaButton
                type="button"
                variant="secondary"
                className="aixia-messenger-attachment-sheet__remove"
                disabled={disabled || attachment.uploading}
                onClick={() => onRemoveAttachment(attachment.id)}
              >
                Remove
              </AixiaButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="aixia-messenger-attachment-sheet__empty">
          Attach images or files before sending. Filenames are included in the agent prompt.
        </p>
      )}
    </div>
  );
}
