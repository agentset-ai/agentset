import { InfoIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { Label } from "./ui/label";
import { RadioGroupItem } from "./ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function RadioButton({
  icon: Icon,
  label,
  tooltip,
  value,
  note,
  noteStyle = "primary",
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tooltip?: string;
  note?: string;
  noteStyle?: "primary" | "muted";
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <RadioGroupItem
        value={value}
        id={value}
        className="peer sr-only"
        aria-label={label}
        disabled={disabled}
      />

      <Label
        htmlFor={value}
        className="border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-col items-center justify-between rounded-md border-2 bg-transparent p-4 text-black"
      >
        <Icon className="mb-3 h-6" />
        <div className="flex items-center gap-1">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger className="mt-0.5">
                <InfoIcon className="size-3" />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </Label>

      {note && (
        <div className="absolute top-0 flex w-full -translate-y-1/2 justify-center">
          <span
            className={cn(
              "w-fit rounded-full px-3 py-0.5 text-center text-xs",
              noteStyle === "primary"
                ? "text-primary-foreground bg-primary"
                : "text-muted-foreground bg-background border-border border",
            )}
          >
            {note}
          </span>
        </div>
      )}
    </div>
  );
}
