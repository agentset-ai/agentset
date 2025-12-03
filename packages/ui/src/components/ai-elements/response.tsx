"use client";

import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@agentset/ui/cn";

import { ImageComponent } from "./markdown-image";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      components={{ img: ImageComponent as any }}
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
