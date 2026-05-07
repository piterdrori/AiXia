import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

type AixiaSearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  width?: "normal" | "wide" | "full";
};

export function AixiaSearchField({
  width = "normal",
  className = "",
  ...props
}: AixiaSearchFieldProps) {
  return (
    <div className="aixia-search-field" data-width={width}>
      <Search className="aixia-search-icon" />
      <input
        type="search"
        className={`aixia-search-input ${className}`}
        {...props}
      />
    </div>
  );
}