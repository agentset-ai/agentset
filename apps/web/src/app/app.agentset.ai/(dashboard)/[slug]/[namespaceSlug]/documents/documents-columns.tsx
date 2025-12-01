import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { formatDuration, formatNumber } from "@/lib/utils";
import {
  BookTextIcon,
  Code2Icon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  ListIcon,
} from "lucide-react";

import type { Document } from "@agentset/db/browser";
import type { BadgeProps } from "@agentset/ui/badge";
import { DocumentStatus } from "@agentset/db/browser";
import { Badge } from "@agentset/ui/badge";
import { Button } from "@agentset/ui/button";
import { YouTubeIcon } from "@agentset/ui/icons/youtube";
import TimestampTooltip from "@agentset/ui/timestamp-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";
import { capitalize, truncate } from "@agentset/utils";

import { ChunksDrawer } from "./chunks-drawer";
import DocumentActions from "./document-actions";
import DocumentSizeTooltip from "./document-size-tooltip";

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
    <Tooltip>
      <TooltipTrigger>
        <Icon className="size-5" />
      </TooltipTrigger>
      <TooltipContent>{mimeType}</TooltipContent>
    </Tooltip>
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
    header: () => <div className="w-10" />,
    accessorKey: "documentProperties.mimeType",
    cell: ({ row }) => {
      return (
        <div className="flex w-10 justify-center">
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
        <DocumentSizeTooltip
          totalCharacters={row.original.totalCharacters}
          totalChunks={row.original.totalChunks}
          totalBytes={row.original.documentProperties?.fileSize ?? 0}
          totalTokens={row.original.totalTokens}
        >
          <p className="w-fit">
            {formatNumber(row.original.totalPages, "compact")}
          </p>
        </DocumentSizeTooltip>
      );
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
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const badge = (
        <Badge
          variant={statusToBadgeVariant(row.original.status)}
          className="capitalize"
        >
          {row.original.status === DocumentStatus.COMPLETED
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
    cell: ({ row }) => {
      const canViewChunks = row.original.status === DocumentStatus.COMPLETED;
      const [chunksDrawerOpen, setChunksDrawerOpen] = useState(false);
      return (
        <div className="flex items-center gap-2">
          <DocumentActions row={row} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={!canViewChunks}
                onClick={() => setChunksDrawerOpen(true)}
                size="icon"
                variant="ghost"
              >
                <ListIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View chunks</TooltipContent>
          </Tooltip>

          <ChunksDrawer
            documentId={row.original.id}
            documentName={row.original.name ?? undefined}
            open={chunksDrawerOpen}
            onOpenChange={setChunksDrawerOpen}
          />
        </div>
      );
    },
  },
];
