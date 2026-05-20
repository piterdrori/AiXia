import type { ReactNode } from "react";

type ExpenseActionFooterProps = {
  left?: ReactNode;
  right?: ReactNode;
};

export function ExpenseActionFooter({ left, right }: ExpenseActionFooterProps) {
  if (!left && !right) return null;

  return (
    <footer className="aixia-expense-action-footer sticky bottom-0 z-20 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">{left}</div>
      <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
    </footer>
  );
}
