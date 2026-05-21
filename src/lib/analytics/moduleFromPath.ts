/** Map route pathname to analytics module_name. */
export function moduleFromPath(pathname: string): string {
  const path = pathname.toLowerCase().split("?")[0];

  if (path === "/" || path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/forgot-password") || path.startsWith("/reset-password") || path.startsWith("/onboarding")) {
    return "auth";
  }
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/projects") || path.startsWith("/tasks")) return "projects";
  if (path.startsWith("/employees")) return "employees";
  if (path.startsWith("/ai-management")) return "ai_management";
  if (path.startsWith("/calendar")) return "calendar";
  if (path.startsWith("/chat") || path.startsWith("/inbox") || path.startsWith("/mail")) {
    return "communications";
  }
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/reports")) return "reports";

  return "general";
}
