import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock3 } from "lucide-react";
import { format } from "date-fns";
import { TaskActivityRow, ProfileRow } from "../../lib/task.types";
import { getProfileName, getInitials, getActivityActionLabel, getActivityActionColor } from "../../lib/task.utils";
import { useAppClock } from "@/lib/clock/provider";
import { useLanguage } from "@/lib/i18n";
import { groupActivityByDate } from "../../lib/task.utils";

interface TaskActivityTabProps {
  activity: TaskActivityRow[];
  profiles: ProfileRow[];
}

export function TaskActivityTab({ activity, profiles }: TaskActivityTabProps) {
  const { t } = useLanguage();
  const clock = useAppClock();

  const groupedActivity = groupActivityByDate(activity.slice(0, 100), clock);

  return (
    <Card className="bg-slate-900/50 border-slate-800 min-h-0 lg:flex-1 lg:overflow-hidden">
      <CardHeader className="shrink-0 pb-4">
        <div className="flex items-center gap-2">
          <Clock3 className="w-5 h-5 text-indigo-400" />
          <CardTitle className="text-white">{t("taskDetail.activity.title")}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {groupedActivity.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
            <Clock3 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-white font-medium">{t("taskDetail.activity.emptyTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("taskDetail.activity.emptyDescription")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivity.map((group) => (
              <div key={group.dateKey} className="space-y-4">
                <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur py-2">
                  <div className="inline-flex rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
                    {group.label}
                  </div>
                </div>

                <div className="space-y-4">
                  {group.items.map((item) => {
                    const actorName = getProfileName(item.user_id, profiles, t("taskDetail.fallbacks.unknown"));

                    return (
                      <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-white">
                            {getInitials(actorName)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-white">{actorName}</p>
                              <Badge className={`${getActivityActionColor(item.action_type)} text-[10px] px-2 py-0.5`}>
                                {getActivityActionLabel(item.action_type)}
                              </Badge>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                              {item.message || t("taskDetail.activity.system")}
                            </p>

                            {item.entity_type && (
                              <div className="mt-2">
                                <Badge className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5">
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
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
