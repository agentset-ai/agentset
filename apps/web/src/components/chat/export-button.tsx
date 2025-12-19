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

    let url: string | undefined;
    try {
      url = exportChatAsJson(messages, title);
      toast.success("Chat exported as JSON");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to export chat as JSON";
      toast.error(errorMessage);
    } finally {
      if (url) {
        // Delay revocation to avoid race condition with download
        setTimeout(() => URL.revokeObjectURL(url!), 100);
      }
    }
  }

  async function handleCopyText() {
    if (isEmpty) {
      toast.error("No messages to copy");
      return;
    }

    try {
      const formattedText = formatChatAsText(messages, title);
      const success = await copyToClipboard(formattedText);
      if (success) {
        toast.success("Chat copied to clipboard");
      } else {
        try {
          await navigator.clipboard.writeText(formattedText);
          toast.success("Chat copied to clipboard");
        } catch (clipboardError) {
          const errorMessage =
            clipboardError instanceof Error
              ? clipboardError.message
              : "Failed to copy to clipboard";
          toast.error(`Failed to copy: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to copy chat to clipboard";
      toast.error(errorMessage);
    }
  }

  function handleDownloadMarkdown() {
    if (isEmpty) {
      toast.error("No messages to export");
      return;
    }

    let url: string | undefined;
    try {
      url = exportChatAsMarkdown(messages, title);
      toast.success("Chat exported as Markdown");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to export chat as Markdown";
      toast.error(errorMessage);
    } finally {
      if (url) {
        setTimeout(() => URL.revokeObjectURL(url!), 100);
      }
    }
  }

  return {
    isEmpty,
    handleDownloadJson,
    handleCopyText,
    handleDownloadMarkdown,
  };
}
