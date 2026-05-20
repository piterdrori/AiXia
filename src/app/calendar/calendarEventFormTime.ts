import type { CheckedState } from "@radix-ui/react-checkbox";

export type MeetingDurationValue = "30" | "60" | "90" | "120";

const MEETING_DURATION_OPTIONS: MeetingDurationValue[] = ["30", "60", "90", "120"];

export function parseCheckboxChecked(checked: CheckedState): boolean {
  return checked === true;
}

/** Timed events (start_time set) must not show as all-day even if all_day is stale in DB. */
export function resolveAllDayFromEvent(
  allDay: boolean | null | undefined,
  startTime: string | null | undefined
): boolean {
  if (startTime) return false;
  return Boolean(allDay);
}

export function inferMeetingDuration(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): MeetingDurationValue {
  if (!startTime || !endTime) return "60";

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let diffMinutes = eh * 60 + em - (sh * 60 + sm);
  if (diffMinutes < 0) diffMinutes += 1440;

  return MEETING_DURATION_OPTIONS.reduce((best, option) => {
    const optionMinutes = Number(option);
    const bestMinutes = Number(best);
    return Math.abs(optionMinutes - diffMinutes) < Math.abs(bestMinutes - diffMinutes)
      ? option
      : best;
  }, "60" as MeetingDurationValue);
}
