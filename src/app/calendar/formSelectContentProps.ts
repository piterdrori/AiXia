/** Shared Radix SelectContent props for calendar create/edit forms (long option lists). */

export const calendarFormSelectContentProps = {
  position: "popper" as const,
  side: "bottom" as const,
  align: "start" as const,
  sideOffset: 6,
  avoidCollisions: true,
  collisionPadding: 8,
};

/** Match tasks/projects filters — readable panel + scrollable height. */
export const calendarFormSelectContentClassName =
  "aixia-calendar-form-select-content aixia-projects-select-content max-h-[min(20rem,var(--radix-select-content-available-height))] overflow-y-auto";



/** Readable option labels inside calendar form selects. */

export const calendarFormSelectItemClassName = "text-foreground";


