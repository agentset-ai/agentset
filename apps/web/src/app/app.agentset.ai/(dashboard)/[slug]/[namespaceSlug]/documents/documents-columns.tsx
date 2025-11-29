import type { ColumnDef } from "@tanstack/react-table";
import { formatDuration, formatNumber } from "@/lib/utils";
import {
  BookTextIcon,
  Code2Icon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
} from "lucide-react";

import type { Document } from "@agentset/db/browser";
import type { BadgeProps } from "@agentset/ui/badge";
import { DocumentStatus } from "@agentset/db/browser";
import { Badge } from "@agentset/ui/badge";
import { YouTubeIcon } from "@agentset/ui/icons/youtube";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";
import { capitalize, formatDate, truncate } from "@agentset/utils";

import DocumentActions from "./document-actions";
import TimestampTooltip from "./document-size-tooltip";

export interface DocumentCol {
  id: string;
  status: DocumentStatus;
  name?: Document["name"];
  source: Document["source"];
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

const MimeType = ({
  mimeType,
  source,
}: {
  mimeType: string;
  source: Document["source"];
}) => {
  let Icon;
  if (source.type === "YOUTUBE_VIDEO") {
    Icon = YouTubeIcon;
  } else if (source.type === "CRAWLED_PAGE") {
    Icon = GlobeIcon;
  } else if (mimeType === "application/pdf") {
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
    id: "type",
    header: "Type",
    accessorKey: "documentProperties.mimeType",
    cell: ({ row }) => {
      return (
        <div>
          {row.original.documentProperties?.mimeType ? (
            <MimeType
              mimeType={row.original.documentProperties.mimeType}
              source={row.original.source}
            />
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.original.name ?? "-";
      return <p title={name}>{truncate(name, 60, "...")}</p>;
    },
  },
  {
    accessorKey: "totalPages",
    header: "Total Pages",
    cell: ({ row }) => {
      return (
        <TimestampTooltip
          totalCharacters={row.original.totalCharacters}
          totalChunks={row.original.totalChunks}
          totalBytes={row.original.documentProperties?.fileSize ?? 0}
          totalTokens={row.original.totalTokens}
        >
          <p className="w-fit">
            {formatNumber(row.original.totalPages, "compact")}
          </p>
        </TimestampTooltip>
      );
    },
  },
  {
    id: "uploadedAt",
    header: "Uploaded At",
    cell: ({ row }) => {
      return <p>{formatDate(row.original.createdAt)}</p>;
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
