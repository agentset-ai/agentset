"use client";

import { MyUIMessage } from "@/types/ai";
import { useChatProperty } from "ai-sdk-zustand";
import { BracesIcon, CopyIcon, FileTextIcon, ShareIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Action } from "@agentset/ui/ai/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

import {
  downloadBlob,
  formatChatAsJson,
  formatChatAsMarkdown,
} from "./export-utils";

interface ExportButtonProps {
  currentId: string;
  disabled?: boolean;
}

export function ExportAction({ currentId, disabled }: ExportButtonProps) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const messagesUpToCurrent = useChatProperty<MyUIMessage, MyUIMessage[]>((s) =>
    s.messages.slice(0, s.messages.findIndex((m) => m.id === currentId) + 1),
  );

  function handleDownload(type: "json" | "markdown") {
    try {
      let content: string;
      let mimeType: string;
      let extension: string;
      if (type === "json") {
        content = formatChatAsJson(messagesUpToCurrent);
        mimeType = "application/json";
        extension = "json";
      } else {
        content = formatChatAsMarkdown(messagesUpToCurrent);
        mimeType = "text/markdown";
        extension = "md";
      }

      const blob = new Blob([content], { type: mimeType });
      downloadBlob(blob, `chat-export-${Date.now()}.${extension}`);
      toast.success(
        `Chat exported as ${type === "json" ? "JSON" : "Markdown"}`,
      );
    } catch (error) {
      toast.error("Failed to export chat");
    }
  }

  const handleCopyMarkdown = async () => {
    const content = formatChatAsMarkdown(messagesUpToCurrent);
    const copied = await copyToClipboard(content);
    if (copied) {
      toast.success("Copied Markdown to clipboard");
    } else {
      toast.error("Failed to copy Markdown");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Action disabled={disabled} tooltip="Export">
          <ShareIcon className="size-4" />
        </Action>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => handleDownload("json")}>
          <BracesIcon className="size-4" />
          Download JSON
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => handleDownload("markdown")}>
          <FileTextIcon className="size-4" />
          Download Markdown
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => handleCopyMarkdown()}>
          <CopyIcon className="size-4" />
          Copy Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
