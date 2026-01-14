import { InfoIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { Label } from "./ui/label";
import { RadioGroupItem } from "./ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function RadioButton({
  icon: Icon,
  label,
  description,
  tooltip,
  value,
  note,
  noteStyle = "primary",
  align = "center",
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  value: string;
  tooltip?: string;
  note?: string;
  noteStyle?: "primary" | "muted";
  align?: "center" | "start" | "end";
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
        className={cn(
          "border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-col items-center justify-between rounded-md border-2 bg-transparent p-4 text-black",
          align === "center" && "items-center",
          align === "start" && "items-start",
          align === "end" && "items-end",
        )}
      >
        <Icon className="mb-3 h-6" />
        <div
          className={cn(
            "flex gap-1",
            align === "center" && "justify-center",
            align === "start" && "justify-start",
            align === "end" && "justify-end",
          )}
        >
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

        {description && (
          <p
            className={cn(
              "text-muted-foreground text-xs",
              align === "center" && "text-center",
              align === "start" && "text-start",
              align === "end" && "text-end",
            )}
          >
            {description}
          </p>
        )}
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
