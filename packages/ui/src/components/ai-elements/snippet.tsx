"use client";

import type { ComponentProps } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { cn } from "@agentset/ui/cn";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@agentset/ui/input-group";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface SnippetContextType {
  code: string;
}

const SnippetContext = createContext<SnippetContextType>({
  code: "",
});

export type SnippetProps = ComponentProps<typeof InputGroup> & {
  code: string;
};

export const Snippet = ({
  code,
  className,
  children,
  ...props
}: SnippetProps) => (
  <SnippetContext.Provider value={{ code }}>
    <InputGroup className={cn("font-mono", className)} {...props}>
      {children}
    </InputGroup>
  </SnippetContext.Provider>
);

export type SnippetAddonProps = ComponentProps<typeof InputGroupAddon>;

export const SnippetAddon = (props: SnippetAddonProps) => (
  <InputGroupAddon {...props} />
);

export type SnippetTextProps = ComponentProps<typeof InputGroupText>;

export const SnippetText = ({ className, ...props }: SnippetTextProps) => (
  <InputGroupText
    className={cn("text-muted-foreground pl-2 font-normal", className)}
    {...props}
  />
);

export type SnippetInputProps = Omit<
  ComponentProps<typeof InputGroupInput>,
  "readOnly" | "value"
>;

export const SnippetInput = ({ className, ...props }: SnippetInputProps) => {
  const { code } = useContext(SnippetContext);

  return (
    <InputGroupInput
      className={cn("text-foreground", className)}
      readOnly
      value={code}
      {...props}
    />
  );
};

export type SnippetCopyButtonProps = ComponentProps<typeof InputGroupButton> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const SnippetCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: SnippetCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { code } = useContext(SnippetContext);

  const copyToClipboard = useCallback(async () => {
    console.log("test");

    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied) {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
          timeout,
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [code, onCopy, onError, timeout, isCopied]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InputGroupButton
          aria-label="Copy"
          className={className}
          onClick={copyToClipboard}
          size="icon-sm"
          title="Copy"
          {...props}
        >
          {children ?? <Icon className="size-3.5" size={14} />}
        </InputGroupButton>
      </TooltipTrigger>
      <TooltipContent>Copy</TooltipContent>
    </Tooltip>
  );
};

export const CodeSnippet = ({
  code,
  className,
  prefix,
}: {
  code: string;
  className?: string;
  prefix?: string;
}) => {
  return (
    <Snippet className={cn("max-w-sm", className)} code={code}>
      {prefix && (
        <SnippetAddon className="pl-1">
          <SnippetText>{prefix}</SnippetText>
        </SnippetAddon>
      )}
      <SnippetInput />
      <SnippetAddon align="inline-end" className="pr-2">
        <SnippetCopyButton />
      </SnippetAddon>
    </Snippet>
  );
};
