import type { ButtonHTMLAttributes, ReactNode } from "react";

type AixiaButtonVariant = "primary" | "secondary" | "danger" | "icon";

type AixiaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: AixiaButtonVariant;
};

function getVariantClass(variant: AixiaButtonVariant) {
  if (variant === "primary") {
    return "aixia-dash-action aixia-dash-action--primary aixia-btn aixia-btn-primary";
  }
  if (variant === "danger") {
    return "aixia-dash-action aixia-dash-action--danger aixia-btn aixia-btn-danger";
  }
  if (variant === "icon") return "aixia-dash-action aixia-icon-btn";

  return "aixia-dash-action aixia-btn aixia-btn-secondary";
}

export function AixiaButton({
  children,
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: AixiaButtonProps) {
  return (
    <button
      type={type}
      className={`${getVariantClass(variant)} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
