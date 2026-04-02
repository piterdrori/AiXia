import { useMemo, useCallback } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Clock3 } from "lucide-react";

import { useAppClock } from "@/lib/clock/provider";
import { useLanguage } from "@/lib/i18n";

import {
  getInitials,
  getActivityActionLabel,
  getActivityActionColor,
  groupActivityByDate,
} from "../../lib/task.utils";

import type {
  TaskActivityRow,
  ProfileRow,
} from "../../lib/task.types";

interface TaskActivityTabProps {
  activity: TaskActivityRow[];
  profiles: ProfileRow[];
}

export function TaskActivityTab({
  activity,
  profiles,
}: TaskActivityTabProps) {
  const { t } = useLanguage();
  const clock = useAppClock();

  // =========================
  // PROFILE MAP (O(1))
  // =========================

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((p) => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  // =========================
  // GROUPED ACTIVITY (MEMOIZED)
  // =========================

  const groupedActivity = useMemo(() => {
    return groupActivityByDate(
      activity.slice(0, 100),
      clock
    );
  }, [activity, clock]);

  // =========================
  // RENDER ITEM
  // =========================

  const renderActivityItem = useCallback(
    (item: TaskActivityRow) => {
      const profile = profileMap.get(item.user_id);
      const actorName =
        profile?.full_name ||
        t("taskDetail.fallbacks.unknown");

      return (
        <div
          key={item.id}
          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
        >
          <div className="flex gap-3 items-start">
            {/* AVATAR */}
            <div className="mt-1 h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white">
              {getInitials(actorName)}
            </div>

            {/* CONTENT */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center flex-wrap">
                <p className="text-white text-sm font-medium">
                  {actorName}
                </p>

                <Badge
                  className={`${getActivityActionColor(
                    item.action_type
                  )} text-[10px]`}
                >
                  {getActivityActionLabel(item.action_type)}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                {item.message ||
                  t("taskDetail.activity.system")}
              </p>

              {item.entity_type && (
                <Badge className="mt-2 bg-slate-800 text-slate-300 text-[10px]">
                  {item.entity_type}
                </Badge>
              )}

              <div className="mt-2 flex items-center text-xs text-slate-500">
                <Clock3 className="w-3 h-3 mr-1" />
                {format(
                  clock.shiftDate(item.created_at),
                  "h:mm a"
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [profileMap, t, clock]
  );

  // =========================
  // EMPTY STATE
  // =========================

  const isEmpty = groupedActivity.length === 0;

  // =========================
  // RENDER
  // =========================

  return (
    <Card className="bg-slate-900/50 border-slate-800 min-h-0 lg:flex-1 lg:overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <Clock3 className="w-5 h-5 text-indigo-400" />
          {t("taskDetail.activity.title")}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isEmpty ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Clock3 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-white font-medium">
              {t("taskDetail.activity.emptyTitle")}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {t("taskDetail.activity.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivity.map((group) => (
              <div key={group.dateKey} className="space-y-4">
                {/* DATE HEADER */}
                <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur py-2">
                  <div className="inline-flex px-3 py-1 text-xs rounded-full border border-slate-800 bg-slate-900 text-slate-300">
                    {group.label}
                  </div>
                </div>

                {/* ITEMS */}
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
