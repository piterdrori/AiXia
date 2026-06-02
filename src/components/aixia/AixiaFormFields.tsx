import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { AixiaButton } from "./AixiaButton";
import { AixiaDatePicker } from "./AixiaDatePicker";

type AixiaFieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  required?: boolean;
  helper?: ReactNode;
};

export function AixiaFieldLabel({
  label,
  required = false,
  helper,
  className = "",
  ...props
}: AixiaFieldLabelProps) {
  return (
    <label className={`aixia-field-label ${className}`} {...props}>
      <span>
        {label}
        {required ? <span className="aixia-field-required">*</span> : null}
      </span>

      {helper ? <span className="aixia-field-helper">{helper}</span> : null}
    </label>
  );
}

type AixiaInputFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function AixiaInputField({
  className = "",
  ...props
}: AixiaInputFieldProps) {
  return <input {...props} className={`aixia-form-input ${className}`} />;
}

type AixiaSelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export function AixiaSelectField({
  className = "",
  children,
  ...props
}: AixiaSelectFieldProps) {
  return (
    <select {...props} className={`aixia-form-select ${className}`}>
      {children}
    </select>
  );
}

type AixiaTextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AixiaTextareaField({
  className = "",
  ...props
}: AixiaTextareaFieldProps) {
  return <textarea {...props} className={`aixia-form-textarea ${className}`} />;
}

type AixiaCheckboxFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: ReactNode;
  description?: ReactNode;
};

export function AixiaCheckboxField({
  label,
  description,
  className = "",
  ...props
}: AixiaCheckboxFieldProps) {
  return (
    <label className={`aixia-checkbox-field ${className}`}>
      <input {...props} type="checkbox" className="aixia-checkbox-input" />

      <span className="aixia-checkbox-body">
        <span className="aixia-checkbox-label">{label}</span>
        {description ? (
          <span className="aixia-checkbox-description">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

type AixiaDisplayBlockProps = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
};

export function AixiaDisplayBlock({
  label,
  value,
  detail,
  className = "",
}: AixiaDisplayBlockProps) {
  return (
    <div className={`aixia-display-block ${className}`}>
      <div className="aixia-display-block-label">{label}</div>
      <div className="aixia-display-block-value">{value || "—"}</div>
      {detail ? <div className="aixia-display-block-detail">{detail}</div> : null}
    </div>
  );
}

type AixiaFormGridProps = HTMLAttributes<HTMLDivElement> & {
  columns?: "one" | "two" | "three";
};

export function AixiaFormGrid({
  columns = "two",
  className = "",
  children,
  ...props
}: AixiaFormGridProps) {
  return (
    <div
      {...props}
      className={`aixia-form-grid ${className}`}
      data-columns={columns}
    >
      {children}
    </div>
  );
}

type AixiaFormFieldProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AixiaFormField({
  className = "",
  children,
  ...props
}: AixiaFormFieldProps) {
  return (
    <div {...props} className={`aixia-form-field ${className}`}>
      {children}
    </div>
  );
}

export type AixiaFormDateFieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  helper?: ReactNode;
  id?: string;
  min?: string;
  max?: string;
  className?: string;
};

/** MW-024 form-date contract: label + picker + optional helper below (`.aixia-helper-text`). */
export function AixiaFormDateField({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  helper,
  id,
  min,
  max,
  className = "",
}: AixiaFormDateFieldProps) {
  const ariaLabel = typeof label === "string" ? label : undefined;

  return (
    <AixiaFormField className={className}>
      <AixiaFieldLabel label={label} required={required} />
      <AixiaDatePicker
        variant="form"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        id={id}
        min={min}
        max={max}
      />
      {helper ? <div className="aixia-helper-text">{helper}</div> : null}
    </AixiaFormField>
  );
}

type AixiaFormFullWidthProps = HTMLAttributes<HTMLDivElement>;

export function AixiaFormFullWidth({
  className = "",
  children,
  ...props
}: AixiaFormFullWidthProps) {
  return (
    <div {...props} className={`aixia-form-full ${className}`}>
      {children}
    </div>
  );
}

type AixiaFormRowCardProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  onRemove?: () => void;
  removeDisabled?: boolean;
  removeLabel?: ReactNode;
};

export function AixiaFormRowCard({
  title,
  description,
  onRemove,
  removeDisabled = false,
  removeLabel = "Remove",
  className = "",
  children,
  ...props
}: AixiaFormRowCardProps) {
  const rowCardClassName = ["aixia-form-row-card", className].filter(Boolean).join(" ");

  return (
    <div {...props} className={rowCardClassName}>
      <div className="aixia-form-row-card-header">
        <div className="aixia-form-row-card-title-wrap">
          <div className="aixia-form-row-card-title">{title}</div>
          {description ? (
            <div className="aixia-form-row-card-description">{description}</div>
          ) : null}
        </div>

        {onRemove ? (
          <AixiaButton
            type="button"
            variant="danger"
            onClick={onRemove}
            disabled={removeDisabled}
            className="aixia-form-row-card-remove"
          >
            {removeLabel}
          </AixiaButton>
        ) : null}
      </div>

      <div className="aixia-form-row-card-body">{children}</div>
    </div>
  );
}
