import { FilterIcon, RefreshCcwIcon } from "lucide-react";

import { DocumentStatus } from "@agentset/db/browser";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

interface PaginatedTableHeaderProps<T extends string> {
  statuses: T[];
  setStatuses: (statuses: T[]) => void;
  statusLabels: { label: string; value: T }[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

const getColorFromStatus = (status: string) => {
  switch (status) {
    case DocumentStatus.FAILED:
    case DocumentStatus.CANCELLED:
    case DocumentStatus.QUEUED_FOR_DELETE:
    case DocumentStatus.DELETING:
      return "bg-destructive";

    case DocumentStatus.COMPLETED:
      return "bg-green-500";

    case DocumentStatus.PROCESSING:
      return "bg-primary";

    case DocumentStatus.PRE_PROCESSING:
    default:
      return "bg-neutral-300 dark:bg-neutral-700";
  }
};

export function PaginatedTableHeader<T extends string>({
  statuses,
  setStatuses,
  statusLabels,
  onRefresh,
  isRefreshing,
}: PaginatedTableHeaderProps<T>) {
  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FilterIcon className="size-4" />
            Filter
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {statusLabels.map(({ label, value }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={statuses.includes(value)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() =>
                setStatuses(
                  statuses.includes(value)
                    ? statuses.filter((s) => s !== value)
                    : [...statuses, value],
                )
              }
              className="capitalize"
            >
              <span
                className={cn(
                  getColorFromStatus(value),
                  "block size-2 rounded-full",
                )}
              />
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2"
        variant="outline"
      >
        <RefreshCcwIcon className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
