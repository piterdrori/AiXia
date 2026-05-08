import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, Pencil, Save, X } from "lucide-react";

type AixiaDetailSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  isEditing?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function AixiaDetailSection({
  title,
  description,
  icon: Icon,
  isEditing = false,
  canEdit = false,
  onEdit,
  onCancel,
  onSave,
  isSaving = false,
  editLabel = "Edit",
  saveLabel = "Save",
  cancelLabel = "Cancel",
  actions,
  children,
  className = "",
  bodyClassName = "",
}: AixiaDetailSectionProps) {
  const shouldShowEditActions = canEdit && (onEdit || onCancel || onSave);

  return (
    <section className={`aixia-detail-section ${className}`}>
      <div className="aixia-detail-section-header">
        <div className="aixia-detail-section-title-wrap">
          {Icon ? (
            <div className="aixia-detail-section-icon">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}

          <div className="min-w-0">
            <h2 className="aixia-detail-section-title">{title}</h2>
            {description ? (
              <p className="aixia-detail-section-description">{description}</p>
            ) : null}
          </div>
        </div>

        {actions || shouldShowEditActions ? (
          <div className="aixia-detail-section-actions">
            {actions}

            {shouldShowEditActions ? (
              isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="aixia-detail-action-secondary"
                  >
                    <X className="h-3.5 w-3.5" />
                    {cancelLabel}
                  </button>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="aixia-detail-action-primary"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saveLabel}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onEdit}
                  className="aixia-detail-action-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editLabel}
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`aixia-detail-section-body ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}