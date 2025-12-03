"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDuration } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import type { IngestJob } from "@agentset/db/browser";
import type { BadgeProps } from "@agentset/ui/badge";
import { IngestJobStatus } from "@agentset/db/browser";
import { Badge } from "@agentset/ui/badge";
import { Button } from "@agentset/ui/button";
import { TimestampTooltip } from "@agentset/ui/timestamp-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";
import { capitalize } from "@agentset/utils";

import { JobActions } from "./actions";
import { ConfigModal } from "./config-modal";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export interface JobCol {
  id: string;
  status: IngestJobStatus;
  name?: IngestJob["name"];
  tenantId?: IngestJob["tenantId"];
  completedAt?: IngestJob["completedAt"];
  failedAt?: IngestJob["failedAt"];
  error?: IngestJob["error"];
  queuedAt?: IngestJob["queuedAt"];
  createdAt: IngestJob["createdAt"];
}

const statusToBadgeVariant = (
  status: IngestJobStatus,
): BadgeProps["variant"] => {
  switch (status) {
    case IngestJobStatus.FAILED:
    case IngestJobStatus.CANCELLED:
    case IngestJobStatus.QUEUED_FOR_DELETE:
    case IngestJobStatus.DELETING:
      return "destructive";
    case IngestJobStatus.COMPLETED:
      return "success";
    case IngestJobStatus.PRE_PROCESSING:
      return "secondary";
    case IngestJobStatus.PROCESSING:
      return "default";
    default:
      return "outline";
  }
};

export const columns: ColumnDef<JobCol>[] = [
  {
    id: "expand",
    header: "",
    cell: ({ row, table }) => {
      const meta = table.options.meta as JobsTableMeta | undefined;
      const expandedJobId = meta?.expandedJobId;
      const onExpand = meta?.onExpand;
      const isExpanded = expandedJobId === row.original.id;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              onClick={() => onExpand?.(isExpanded ? null : row.original.id)}
            >
              {isExpanded ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Documents</TooltipContent>
        </Tooltip>
      );
    },
    size: 32,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.original.name || "-";

      return (
        <p title={name}>
          {name.length > 20 ? name.slice(0, 20) + "..." : name}
        </p>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const badge = (
        <Badge
          variant={statusToBadgeVariant(row.original.status)}
          className="capitalize"
        >
          {row.original.status === IngestJobStatus.COMPLETED
            ? "Ready"
            : capitalize(row.original.status.split("_").join(" "))}
        </Badge>
      );

      if (!row.original.error) return badge;

      return (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>{row.original.error}</TooltipContent>
        </Tooltip>
      );
    },
  },
  // {
  //   id: "type",
  //   accessorKey: "payload",
  //   header: "Type",
  //   cell: ({ row }) => {
  //     return (
  //       <p>{capitalize(row.original.payload.type.split("_").join(" "))}</p>
  //     );
  //   },
  // },
  {
    accessorKey: "tenantId",
    header: "Tenant ID",
    cell: ({ row }) => {
      return <p>{row.original.tenantId ?? "-"}</p>;
    },
  },

  {
    id: "uploadedAt",
    header: "Uploaded At",
    cell: ({ row }) => {
      return (
        <TimestampTooltip timestamp={row.original.createdAt}>
          <p className="w-fit">
            {row.original.createdAt.toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </TimestampTooltip>
      );
    },
  },
  {
    id: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const finishDate = row.original.completedAt ?? row.original.failedAt;
      return (
        <p>
          {finishDate && row.original.queuedAt
            ? formatDuration(row.original.queuedAt, finishDate)
            : "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "config",
    header: "Config",
    cell: ({ row }) => {
      return <ConfigModal jobId={row.original.id} />;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <JobActions row={row} />,
  },
];

// Add a type for TableMeta to allow expandedJobId and onExpand
export type JobsTableMeta = {
  expandedJobId?: string | null;
  onExpand?: (jobId: string | null) => void;
};
