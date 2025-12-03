"use client";

import { useCallback, useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { isFreePlan } from "@agentset/stripe/plans";
import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@agentset/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

import CrawlForm from "./crawl-form";
import FilesForm from "./files-form";
import TextForm from "./text-form";
import YoutubeForm from "./youtube-form";

const TABS = [
  { value: "files", label: "Files", Component: FilesForm },
  { value: "text", label: "Text", Component: TextForm },
  { value: "website", label: "Website", Component: CrawlForm },
  { value: "youtube", label: "YouTube", Component: YoutubeForm },
] as const;

const SUCCESS_MESSAGES: Record<(typeof TABS)[number]["value"], string> = {
  files: "File ingestion job created",
  text: "Text ingestion job created",
  website: "Website ingestion job created",
  youtube: "YouTube ingestion job created",
};

export function IngestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["value"]>("files");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const organization = useOrganization();
  const namespace = useNamespace();

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    void queryClient.invalidateQueries(
      trpc.ingestJob.all.queryFilter({ namespaceId: namespace.id }),
    );
    toast.success(SUCCESS_MESSAGES[activeTab]);
  }, [queryClient, trpc.ingestJob.all, namespace.id, activeTab]);

  const isPending =
    queryClient.isMutating(trpc.ingestJob.ingest.mutationOptions()) > 0;

  const isOverLimit =
    isFreePlan(organization.plan) &&
    organization.totalPages >= organization.pagesLimit;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (isPending) return;
        if (newOpen && isOverLimit) return;
        setIsOpen(newOpen);
      }}
    >
      <div>
        <DialogTrigger asChild>
          {isOverLimit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled>
                    <PlusIcon className="h-4 w-4" /> Ingest
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>You've reached your plan's limits. Upgrade to ingest more</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button>
              <PlusIcon className="h-4 w-4" /> Ingest
            </Button>
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-2xl" scrollableOverlay>
        <DialogHeader>
          <DialogTitle>Ingest Content</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="w-full">
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="flex-1">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map(({ value, Component }) => (
            <TabsContent key={value} value={value}>
              <Component onSuccess={handleSuccess} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
