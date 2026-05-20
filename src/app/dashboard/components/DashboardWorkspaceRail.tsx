import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  Bell,
  Mail,
  Users,
  Landmark,
  Settings,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  getEffectivePermissions,
  type Permission,
  type Role as PermissionRole,
} from "@/lib/permissions";

type RailItem = {
  href: string;
  label: string;
  icon: typeof FolderKanban;
};

export function DashboardWorkspaceRail({
  role,
  permissionOverrides,
}: {
  role: PermissionRole | null;
  permissionOverrides?: Partial<Record<Permission, boolean>> | null;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const perms = useMemo(
    () => (role ? getEffectivePermissions(role, permissionOverrides ?? null) : null),
    [role, permissionOverrides]
  );

  const items = useMemo(() => {
    const list: RailItem[] = [
      {
        href: "/dashboard",
        label: t("common.dashboard", "Dashboard"),
        icon: LayoutDashboard,
      },
      {
        href: "/projects",
        label: t("common.projects", "Projects"),
        icon: FolderKanban,
      },
      {
        href: "/tasks",
        label: t("common.tasks", "Tasks"),
        icon: CheckSquare,
      },
      {
        href: "/calendar",
        label: t("common.calendar", "Calendar"),
        icon: Calendar,
      },
      {
        href: "/chat",
        label: t("common.chat", "Chat"),
        icon: MessageSquare,
      },
      {
        href: "/inbox",
        label: t("common.inbox", "Inbox"),
        icon: Bell,
      },
      {
        href: "/mail",
        label: t("common.mail", "Mail"),
        icon: Mail,
      },
    ];

    if (perms?.viewEmployeeDirectory) {
      list.push({
        href: "/employees",
        label: t("common.employees", "Employees"),
        icon: Users,
      });
    }

    if (perms?.accessFinance) {
      list.push({
        href: "/finance",
        label: t("common.finance", "Finance"),
        icon: Landmark,
      });
    }

    list.push(
      {
        href: "/ai-management",
        label: t("dashboard.workspaceAiManagement", "AI Management"),
        icon: Sparkles,
      },
      {
        href: "/settings",
        label: t("common.settings", "Settings"),
        icon: Settings,
      }
    );

    return list;
  }, [perms, t]);

  return (
    <nav
      className="aixia-dash-rail aixia-dash-glass aixia-dash-tilt-panel"
      aria-label={t("dashboard.workspaceRailAria", "Workspace shortcuts")}
    >
      <div className="aixia-dash-rail-label">
        {t("dashboard.workspaceRailKicker", "Jump to")}
      </div>
      <div className="aixia-dash-rail-tracks">
        {items.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            type="button"
            className="aixia-dash-rail-chip"
            onClick={() => navigate(href)}
          >
            <span className="aixia-dash-rail-chip-icon" aria-hidden>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="aixia-dash-rail-chip-text">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
