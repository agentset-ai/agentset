"use client";

import { cn } from "@agentset/ui/cn";
import { CopyButton } from "@agentset/ui/copy-button";

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: string;
  hasCopy?: boolean;
}

export function CodeBlock({
  inline = false,
  className,
  children,
  hasCopy = true,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose group relative flex flex-col">
        {hasCopy && (
          <CopyButton
            textToCopy={children}
            className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}

        <pre
          {...props}
          className={cn(
            "w-full overflow-x-auto rounded-xl border border-zinc-200 p-4 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50",

            className,
          )}
        >
          <code className="min-w-0 break-words [word-break:break-word] whitespace-pre-wrap">
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code
      className={cn(
        "rounded-md bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-800",
        className,
      )}
      {...props}
    >
      {children}
    </code>
  );
}
