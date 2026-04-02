import { useMemo, useCallback } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Clock3 } from "lucide-react";

import { useAppClock } from "@/lib/clock/provider";
import { useLanguage } from "@/lib/i18n";

import {
  getActivityActionColor,
  getActivityActionLabel,
  getInitials,
  groupActivityByDate,
} from "../../lib/task.utils";

import type { ProfileRow, TaskActivityRow } from "../../lib/task.types";

interface TaskActivityTabProps {
  activity: TaskActivityRow[];
  profiles: ProfileRow[];
}

export function TaskActivityTab({ activity, profiles }: TaskActivityTabProps) {
  const { t } = useLanguage();
  const clock = useAppClock();

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.user_id, profile));
    return map;
  }, [profiles]);

  const groupedActivity = useMemo(() => {
    return groupActivityByDate(activity.slice(0, 100), clock);
  }, [activity, clock]);

  const renderActivityItem = useCallback(
    (item: TaskActivityRow) => {
      const actorName =
        profileMap.get(item.user_id || "")?.full_name ||
        t("taskDetail.fallbacks.unknown");

      return (
        <div
          key={item.id}
          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-white">
              {getInitials(actorName)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-white">{actorName}</p>
                <Badge
                  className={`${getActivityActionColor(item.action_type)} px-2 py-0.5 text-[10px]`}
                >
                  {getActivityActionLabel(item.action_type)}
                </Badge>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {item.message || t("taskDetail.activity.system")}
              </p>

              {item.entity_type && (
                <div className="mt-2">
                  <Badge className="bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                    {item.entity_type}
                  </Badge>
                </div>
              )}

              <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 className="h-3 w-3" />
                <span>{format(clock.shiftDate(item.created_at), "h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      );
    },
    [profileMap, t, clock],
  );

  return (
    <Card className="min-h-0 border-slate-800 bg-slate-900/50 lg:flex-1 lg:overflow-hidden">
      <CardHeader className="shrink-0 pb-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">
            {t("taskDetail.activity.title")}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {groupedActivity.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
            <Clock3 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="font-medium text-white">
              {t("taskDetail.activity.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t("taskDetail.activity.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivity.map((group) => (
              <div key={group.dateKey} className="space-y-4">
                <div className="sticky top-0 z-10 bg-slate-950/95 py-2 backdrop-blur">
                  <div className="inline-flex rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
                    {group.label}
                  </div>
                </div>

                <div className="space-y-4">
                  {group.items.map(renderActivityItem)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
