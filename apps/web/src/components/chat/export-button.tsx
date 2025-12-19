"use client";

import { MyUIMessage } from "@/types/ai";
import { useChatMessages } from "ai-sdk-zustand";
import { BracesIcon, CopyIcon, FileTextIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";

import {
  exportChatAsJson,
  exportChatAsMarkdown,
  formatChatAsText,
} from "./export-utils";

interface ExportButtonProps {
  title?: string;
}

export function ExportButton({ title }: ExportButtonProps) {
  const { handleDownloadJson, handleCopyText, handleDownloadMarkdown } =
    useExportChat({ title });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <SaveIcon className="size-4" />
          Export
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleDownloadJson}>
          <BracesIcon className="size-4" />
          Download as JSON
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={handleDownloadMarkdown}>
          <FileTextIcon className="size-4" />
          Download as Markdown
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={handleCopyText}>
          <CopyIcon className="size-4" />
          Copy as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useExportChat({ title }: ExportButtonProps) {
  const messages = useChatMessages<MyUIMessage>();
  const [_, copyToClipboard] = useCopyToClipboard();

  const isEmpty = messages.length === 0;

  function handleDownloadJson() {
    if (isEmpty) {
      toast.error("No messages to export");
      return;
    }

    exportChatAsJson(messages, title);
    toast.success("Chat exported as JSON");
  }

  async function handleCopyText() {
    if (isEmpty) {
      toast.error("No messages to copy");
      return;
    }

    const formattedText = formatChatAsText(messages, title);
    await copyToClipboard(formattedText);
    toast.success("Chat copied to clipboard");
  }

  function handleDownloadMarkdown() {
    if (isEmpty) {
      toast.error("No messages to export");
      return;
    }

    exportChatAsMarkdown(messages, title);
    toast.success("Chat exported as Markdown");
  }

  return {
    isEmpty,
    handleDownloadJson,
    handleCopyText,
    handleDownloadMarkdown,
  };
}
