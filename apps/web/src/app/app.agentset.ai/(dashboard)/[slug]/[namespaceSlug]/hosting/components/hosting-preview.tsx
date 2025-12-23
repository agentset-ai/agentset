"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { EyeIcon, SendIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@agentset/ui/sheet";

import type { HostingFormValues } from "../use-hosting-form";

interface HostingPreviewProps {
  form: UseFormReturn<HostingFormValues>;
}

export function HostingPreview({ form }: HostingPreviewProps) {
  const logo = form.watch("logo");
  const title = form.watch("title");
  const welcomeMessage = form.watch("welcomeMessage");
  const exampleQuestions = form.watch("exampleQuestions");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      <div className="bg-muted/30 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Preview
        </span>
      </div>

      <div className="bg-background flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="flex w-full max-w-md flex-col gap-4">
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className="size-10 rounded-md object-cover"
              />
            ) : null}

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">
                {welcomeMessage || title || "Welcome!"}
              </h3>
            </div>
          </div>
        </div>

        <div>
          {exampleQuestions && exampleQuestions.length > 0 && (
            <div className="mx-4 mb-4 grid gap-2">
              {exampleQuestions
                .filter(Boolean)
                .slice(0, 4)
                .map((question, index) => (
                  <MockSuggestionButton key={index} text={question} />
                ))}
            </div>
          )}

          <div className="border-t p-4">
            <div className="bg-muted/50 flex items-center gap-2 rounded-lg border px-4 py-3">
              <span className="text-muted-foreground flex-1 text-sm">
                Ask a question...
              </span>
              <SendIcon className="text-muted-foreground size-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSuggestionButton({ text }: { text: string }) {
  return (
    <div className="line-clamp-1 rounded-xl border bg-transparent px-4 py-2.5 text-left text-sm">
      {text}
    </div>
  );
}

export function MobilePreviewButton({ form }: HostingPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "fixed right-4 bottom-4 z-50 gap-2 shadow-lg lg:hidden",
          )}
        >
          <EyeIcon className="size-4" />
          Preview
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat Preview</SheetTitle>
        </SheetHeader>
        <div className="h-full pt-4">
          <HostingPreview form={form} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
