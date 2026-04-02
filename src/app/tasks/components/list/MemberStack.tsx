import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n";

import { getInitials } from "../../lib/task.utils";
import type { ProfileRow } from "../../lib/task.types";

interface MemberStackProps {
  profiles: ProfileRow[];
  size?: "small" | "medium";
}

export function MemberStack({
  profiles,
  size = "small",
}: MemberStackProps) {
  const { t } = useLanguage();

  const visibleProfiles = useMemo(() => profiles.slice(0, 3), [profiles]);
  const remainingCount = useMemo(
    () => Math.max(profiles.length - 3, 0),
    [profiles.length]
  );

  const avatarClass = useMemo(() => {
    return size === "medium"
      ? "w-7 h-7 border-2 border-slate-900"
      : "w-6 h-6 border-2 border-slate-900";
  }, [size]);

  const textClass = useMemo(() => {
    return size === "medium" ? "text-xs" : "text-[10px]";
  }, [size]);

  const overflowClass = useMemo(() => {
    return size === "medium"
      ? "w-7 h-7 text-xs"
      : "w-6 h-6 text-[10px]";
  }, [size]);

  const fallbackInitial = t("tasks.fallbacks.userInitial");

  return (
    <div className="flex -space-x-2">
      {visibleProfiles.map((profile) => (
        <Avatar key={profile.user_id} className={avatarClass}>
          <AvatarFallback className={`bg-indigo-600 text-white ${textClass}`}>
            {getInitials(profile.full_name, fallbackInitial)}
          </AvatarFallback>
        </Avatar>
      ))}

      {remainingCount > 0 && (
        <div
          className={`${overflowClass} rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-slate-400`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
