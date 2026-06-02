"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatAixiaDateDisplay,
  formatAixiaDateValue,
  isAixiaDateAfterMax,
  isAixiaDateBeforeMin,
  parseAixiaDateValue,
} from "@/lib/aixia/datePicker";

export type AixiaDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  min?: string;
  max?: string;
  className?: string;
  variant?: "form" | "compact";
  captionLayout?: "dropdown" | "label";
  startMonth?: Date;
  endMonth?: Date;
  id?: string;
};

const DEFAULT_PLACEHOLDER = "mm/dd/yyyy";

export function AixiaDatePicker({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  "aria-label": ariaLabel,
  min,
  max,
  className = "",
  variant = "form",
  captionLayout = "dropdown",
  startMonth = new Date(1950, 0),
  endMonth = new Date(new Date().getFullYear() + 10, 11),
  id,
}: AixiaDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseAixiaDateValue(value), [value]);
  const defaultMonth = selectedDate ?? new Date();

  return (
    <div
      className={cn(
        "aixia-date-picker",
        variant === "compact"
          ? "aixia-date-picker--compact"
          : "aixia-date-picker--form",
        className,
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            className="aixia-date-picker-trigger aixia-form-input"
          disabled={disabled}
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          <span className="aixia-date-picker-trigger__value">
            {formatAixiaDateDisplay(value, placeholder)}
          </span>
          <CalendarDays className="aixia-date-picker-trigger__icon" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="aixia-date-picker-popover"
      >
        <UiCalendar
          mode="single"
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
          defaultMonth={defaultMonth}
          selected={selectedDate}
          disabled={(date) =>
            isAixiaDateBeforeMin(date, min) || isAixiaDateAfterMax(date, max)
          }
          onSelect={(date) => {
            if (!date) return;
            onChange(formatAixiaDateValue(date));
            setOpen(false);
          }}
          className="aixia-date-picker-calendar"
        />
      </PopoverContent>
    </Popover>
    </div>
  );
}
