import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ProfileRow } from "../../lib/task.types";
import { getInitials } from "../../lib/task.utils";
import { useLanguage } from "@/lib/i18n";

interface MemberStackProps {
  profiles: ProfileRow[];
  size?: "small" | "medium";
}

export function MemberStack({ profiles, size = "small" }: MemberStackProps) {
  const { t } = useLanguage();

  const avatarClass =
    size === "medium"
      ? "w-7 h-7 border-2 border-slate-900"
      : "w-6 h-6 border-2 border-slate-900";
  const textClass = size === "medium" ? "text-xs" : "text-[10px]";

  return (
    <div className="flex -space-x-2">
      {profiles.slice(0, 3).map((profile) => (
        <Avatar key={profile.user_id} className={avatarClass}>
          <AvatarFallback className={`bg-indigo-600 text-white ${textClass}`}>
            {getInitials(profile.full_name, t("tasks.fallbacks.userInitial"))}
          </AvatarFallback>
        </Avatar>
      ))}

      {profiles.length > 3 && (
        <div
          className={`${
            size === "medium" ? "w-7 h-7 text-xs" : "w-6 h-6 text-[10px]"
          } rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-slate-400`}
        >
          +{profiles.length - 3}
        </div>
      )}
    </div>
  );
}
