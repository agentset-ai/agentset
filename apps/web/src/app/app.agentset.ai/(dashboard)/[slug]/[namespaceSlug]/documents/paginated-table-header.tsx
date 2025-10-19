import { FilterIcon, RefreshCcwIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
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

export function PaginatedTableHeader<T extends string>({
  statuses,
  setStatuses,
  statusLabels,
  onRefresh,
  isRefreshing,
}: PaginatedTableHeaderProps<T>) {
  return (
    <div className="flex gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FilterIcon className="size-4" />
            Filter
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
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
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2"
      >
        <RefreshCcwIcon className="h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}
