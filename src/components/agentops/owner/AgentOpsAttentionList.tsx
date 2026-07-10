import { AlertCircle, CheckCircle2 } from "lucide-react";

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  tone?: "warning" | "danger" | "info";
  actionLabel?: string;
  onAction?: () => void;
};

export function AgentOpsAttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
        <div>
          <p className="font-medium text-emerald-100">All clear. No action is needed.</p>
          <p className="mt-1 text-sm text-emerald-100/70">
            Your agents and monitoring checks look stable right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                item.tone === "danger"
                  ? "text-rose-300"
                  : item.tone === "info"
                    ? "text-cyan-300"
                    : "text-amber-300"
              }`}
              aria-hidden
            />
            <div>
              <p className="font-medium text-white">{item.title}</p>
              <p className="mt-0.5 text-sm text-white/60">{item.detail}</p>
            </div>
          </div>
          {item.actionLabel && item.onAction ? (
            <button
              type="button"
              onClick={item.onAction}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/90 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {item.actionLabel}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
