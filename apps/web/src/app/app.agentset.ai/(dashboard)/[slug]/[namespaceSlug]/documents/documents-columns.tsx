import type { ColumnDef } from "@tanstack/react-table";
import { formatDuration, formatNumber } from "@/lib/utils";
import { BookTextIcon, Code2Icon, FileTextIcon, ImageIcon } from "lucide-react";

import type { Document } from "@agentset/db";
import type { BadgeProps } from "@agentset/ui/badge";
import { DocumentStatus } from "@agentset/db";
import { Badge } from "@agentset/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";
import { capitalize, formatBytes } from "@agentset/utils";

import DocumentActions from "./document-actions";

export interface DocumentCol {
  id: string;
  status: DocumentStatus;
  name?: Document["name"];
  totalChunks: number;
  totalCharacters: number;
  totalTokens: number;
  totalPages: number;
  documentProperties?: Document["documentProperties"];
  createdAt: Date;
  completedAt?: Document["completedAt"];
  queuedAt?: Document["queuedAt"];
  failedAt?: Document["failedAt"];
  error?: Document["error"];
}

const MimeType = ({ mimeType }: { mimeType: string }) => {
  let Icon;
  if (mimeType === "application/pdf") {
    Icon = BookTextIcon;
  } else if (mimeType.startsWith("image/")) {
    Icon = ImageIcon;
  } else if (
    mimeType === "text/html" ||
    mimeType === "application/xhtml+xml" ||
    mimeType === "text/xml"
  ) {
    Icon = Code2Icon;
  } else {
    Icon = FileTextIcon;
  }

  return (
    <div className="flex flex-row gap-2">
      <Tooltip>
        <TooltipTrigger>
          <Icon className="size-5" />
        </TooltipTrigger>
        <TooltipContent>{mimeType}</TooltipContent>
      </Tooltip>
    </div>
  );
};

const statusToBadgeVariant = (
  status: DocumentStatus,
): BadgeProps["variant"] => {
  switch (status) {
    case DocumentStatus.FAILED:
    case DocumentStatus.CANCELLED:
    case DocumentStatus.QUEUED_FOR_DELETE:
    case DocumentStatus.DELETING:
      return "destructive";

    case DocumentStatus.COMPLETED:
      return "success";

    case DocumentStatus.PRE_PROCESSING:
      return "secondary";
    case DocumentStatus.PROCESSING:
      return "default";
    default:
      return "outline";
  }
};

export const documentColumns: ColumnDef<DocumentCol>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.original.name ?? "-";

      return (
        <p title={name}>
          {name.length > 20 ? name.slice(0, 20) + "..." : name}
        </p>
      );
    },
  },
  // {
  //   id: "source",
  //   header: "Source",
  //   accessorKey: "source",
  //   cell: ({ row }) => {
  //     return <p>{capitalize(row.original.source.type.split("_").join(" "))}</p>;
  //   },
  // },
  {
    id: "type",
    header: "Type",
    accessorKey: "documentProperties.mimeType",
    cell: ({ row }) => {
      return (
        <div>
          {row.original.documentProperties?.mimeType ? (
            <MimeType mimeType={row.original.documentProperties.mimeType} />
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "totalChunks",
    header: "Total Chunks",
    cell: ({ row }) => {
      return <p>{formatNumber(row.original.totalChunks, "compact")}</p>;
    },
  },
  {
    accessorKey: "totalCharacters",
    header: "Total Characters",
    cell: ({ row }) => {
      return <p>{formatNumber(row.original.totalCharacters, "compact")}</p>;
    },
  },
  {
    accessorKey: "totalTokens",
    header: "Total Tokens",
    cell: ({ row }) => {
      return <p>{formatNumber(row.original.totalTokens, "compact")}</p>;
    },
  },
  {
    accessorKey: "totalPages",
    header: "Total Pages",
    cell: ({ row }) => {
      return <p>{formatNumber(row.original.totalPages, "compact")}</p>;
    },
  },
  {
    id: "size",
    accessorKey: "documentProperties.fileSize",
    header: "Size",
    cell: ({ row }) => {
      return (
        <p>
          {row.original.documentProperties?.fileSize
            ? formatBytes(row.original.documentProperties.fileSize)
            : "-"}
        </p>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const badge = (
        <Badge
          variant={statusToBadgeVariant(row.original.status)}
          className="capitalize"
        >
          {capitalize(row.original.status.split("_").join(" "))}
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
    id: "actions",
    cell: ({ row }) => <DocumentActions row={row} />, // Use the DocumentActions component
  },
];
