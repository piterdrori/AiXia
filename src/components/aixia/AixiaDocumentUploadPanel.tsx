import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Eye, FileText, Loader2, Save, Upload, X } from "lucide-react";

import { AixiaAlert } from "./AixiaAlert";
import { AixiaBadge } from "./AixiaBadge";
import { AixiaButton } from "./AixiaButton";

export type AixiaDocumentUploadAttachment = {
  id: string;
  fileName: ReactNode;
  badge?: ReactNode;
  sizeLabel?: ReactNode;
  description?: ReactNode;
  openLabel?: ReactNode;
};

type AixiaDocumentUploadPanelProps = {
  selectedFile?: File | null;
  attachments?: AixiaDocumentUploadAttachment[];
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  accept?: string;
  dropTitle?: ReactNode;
  dropDescription?: ReactNode;
  uploadLabel?: ReactNode;
  uploadingLabel?: ReactNode;
  selectedFileLabel?: ReactNode;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  requiredMessage?: ReactNode;
  onFileSelect: (file: File | null) => void;
  onUpload: () => void | Promise<void>;
  onOpenAttachment?: (attachment: AixiaDocumentUploadAttachment) => void | Promise<void>;
  onRemoveSelectedFile?: () => void;
};

function getFileSizeLabel(file: File | null | undefined) {
  if (!file) return "No file selected";
  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

export function AixiaDocumentUploadPanel({
  selectedFile = null,
  attachments = [],
  required = false,
  disabled = false,
  uploading = false,
  accept,
  dropTitle = "Drop file here",
  dropDescription = "PDF, image, Word, Excel, or supported document file. Click to browse.",
  uploadLabel = "Upload Document",
  uploadingLabel = "Uploading...",
  selectedFileLabel = "Selected file",
  emptyTitle = "No document uploaded",
  emptyDescription = "Upload the required document to continue this workflow.",
  requiredMessage = "Document upload is required before this workflow can continue.",
  onFileSelect,
  onUpload,
  onOpenAttachment,
  onRemoveSelectedFile,
}: AixiaDocumentUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const hasAttachments = attachments.length > 0;
  const uploadDisabled = disabled || uploading;
  const canUploadSelectedFile = !disabled && !uploading && Boolean(selectedFile);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelect(event.target.files?.[0] || null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (uploadDisabled) return;

    onFileSelect(event.dataTransfer.files?.[0] || null);
  }

  function handleDrag(event: DragEvent<HTMLButtonElement>, nextDragging: boolean) {
    event.preventDefault();
    event.stopPropagation();

    if (uploadDisabled) return;

    setIsDragging(nextDragging);
  }

  function openAttachment(attachment: AixiaDocumentUploadAttachment) {
    if (!onOpenAttachment || uploading) return;
    void onOpenAttachment(attachment);
  }

  return (
    <div className="aixia-document-upload-panel">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploadDisabled}
        onChange={handleInputChange}
      />

      <button
        type="button"
        disabled={uploadDisabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => handleDrag(event, true)}
        onDragOver={(event) => handleDrag(event, true)}
        onDragLeave={(event) => handleDrag(event, false)}
        onDrop={handleDrop}
        className={
          isDragging
            ? "aixia-document-upload-zone is-dragging"
            : "aixia-document-upload-zone"
        }
      >
        <span className="aixia-document-upload-icon">
          <Upload className="h-5 w-5" />
        </span>

        <span className="aixia-document-upload-copy">
          <span className="aixia-document-upload-title">{dropTitle}</span>
          <span className="aixia-document-upload-description">{dropDescription}</span>
        </span>

        <span className="aixia-document-upload-browse">Browse</span>
      </button>

      {selectedFile ? (
        <div className="aixia-document-selected-file">
          <div className="aixia-document-file-icon">
            <FileText className="h-5 w-5" />
          </div>

          <div className="aixia-document-file-copy">
            <div className="aixia-document-file-label">{selectedFileLabel}</div>
            <div className="aixia-document-file-name">{selectedFile.name}</div>
            <div className="aixia-document-file-meta">{getFileSizeLabel(selectedFile)}</div>
          </div>

          <AixiaButton
            type="button"
            variant="secondary"
            onClick={onRemoveSelectedFile || (() => onFileSelect(null))}
            disabled={uploadDisabled}
          >
            <X className="h-4 w-4" />
            Remove
          </AixiaButton>
        </div>
      ) : null}

      <AixiaButton
        type="button"
        variant="primary"
        className="aixia-document-upload-action"
        onClick={() => void onUpload()}
        disabled={!canUploadSelectedFile}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {uploading ? uploadingLabel : uploadLabel}
      </AixiaButton>

      <div className="aixia-document-attachment-list">
        {!hasAttachments ? (
          <AixiaAlert tone={required ? "error" : "info"}>
            <strong>{emptyTitle}</strong>
            <span>{required ? requiredMessage : emptyDescription}</span>
          </AixiaAlert>
        ) : (
          attachments.map((attachment) => {
            const clickable = Boolean(onOpenAttachment);

            if (clickable) {
              return (
                <button
                  key={attachment.id}
                  type="button"
                  className="aixia-document-attachment-card is-clickable"
                  disabled={uploading}
                  onClick={() => openAttachment(attachment)}
                >
                  <span className="aixia-document-file-icon">
                    <FileText className="h-5 w-5" />
                  </span>

                  <span className="aixia-document-file-copy">
                    <span className="aixia-document-file-name">{attachment.fileName}</span>

                    <span className="aixia-document-attachment-meta">
                      {attachment.badge ? (
                        <AixiaBadge tone="cyan">{attachment.badge}</AixiaBadge>
                      ) : null}
                      {attachment.sizeLabel ? <span>{attachment.sizeLabel}</span> : null}
                    </span>

                    {attachment.description ? (
                      <span className="aixia-document-file-meta">
                        {attachment.description}
                      </span>
                    ) : null}
                  </span>

                  <span className="aixia-document-open-pill">
                    <Eye className="h-4 w-4" />
                    {attachment.openLabel || "Open"}
                  </span>
                </button>
              );
            }

            return (
              <div key={attachment.id} className="aixia-document-attachment-card">
                <div className="aixia-document-file-icon">
                  <FileText className="h-5 w-5" />
                </div>

                <div className="aixia-document-file-copy">
                  <div className="aixia-document-file-name">{attachment.fileName}</div>

                  <div className="aixia-document-attachment-meta">
                    {attachment.badge ? (
                      <AixiaBadge tone="cyan">{attachment.badge}</AixiaBadge>
                    ) : null}
                    {attachment.sizeLabel ? <span>{attachment.sizeLabel}</span> : null}
                  </div>

                  {attachment.description ? (
                    <div className="aixia-document-file-meta">{attachment.description}</div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
