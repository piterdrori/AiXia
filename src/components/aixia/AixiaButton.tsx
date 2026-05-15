import type { ButtonHTMLAttributes, ReactNode } from "react";

type AixiaButtonVariant = "primary" | "secondary" | "danger" | "icon";

type AixiaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: AixiaButtonVariant;
};

function getVariantClass(variant: AixiaButtonVariant) {
  if (variant === "primary") return "aixia-btn-primary";
  if (variant === "danger") return "aixia-btn-danger";
  if (variant === "icon") return "aixia-icon-btn";

  return "aixia-btn-secondary";
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
      className={`${getVariantClass(variant)} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}