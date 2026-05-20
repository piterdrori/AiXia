type AppWindow = Window & {
  __AIXIA_ONLINE_USERS__?: Record<string, boolean>;
};

export function getAixiaOnlineUsersSnapshot(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return (window as AppWindow).__AIXIA_ONLINE_USERS__ || {};
}

/** Syncs with DashboardLayout Supabase presence (`global-online-users`). */
export function subscribeAixiaOnlineUsers(
  listener: (map: Record<string, boolean>) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<Record<string, boolean>>).detail;
    listener(detail || {});
  };

  window.addEventListener("aixia-online-users-changed", handler as EventListener);
  listener(getAixiaOnlineUsersSnapshot());

  return () => {
    window.removeEventListener("aixia-online-users-changed", handler as EventListener);
  };
}
