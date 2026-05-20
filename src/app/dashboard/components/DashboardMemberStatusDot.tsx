/** Green live indicator only when online — no offline/red state. */
export function DashboardMemberStatusDot({ online }: { online: boolean }) {
  if (!online) return null;

  return (
    <span
      className="aixia-dash-status-pill aixia-dash-status-pill--online aixia-dash-status-pill--live"
      title="Online"
      aria-label="Online"
    />
  );
}

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}
