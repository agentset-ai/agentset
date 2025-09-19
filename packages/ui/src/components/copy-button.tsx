"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
}

export function CopyButton({ textToCopy, className }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="link"
          size="icon"
          onClick={handleCopy}
          className={cn("h-8 w-8", className)}
          type="button"
        >
          {isCopied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
          <span className="sr-only">Copy to clipboard</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
