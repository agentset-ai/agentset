"use client";

import { useState } from "react";
import { useNamespace } from "@/contexts/namespace-context";
import { useOrganization } from "@/contexts/organization-context";
import { useTRPC } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { isProPlan } from "@agentset/stripe/plans";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@agentset/ui";

import TextForm from "./text-form";
import UploadForm from "./upload-form";
import UrlsForm from "./urls-form";

export function IngestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganization();
  const { activeNamespace } = useNamespace();

  const onSuccess = () => {
    setIsOpen(false);
    void queryClient.invalidateQueries(
      trpc.ingestJob.all.queryFilter({ namespaceId: activeNamespace.id }),
    );
  };

  const onTextSuccess = () => {
    onSuccess();
    toast.success("Text ingestion job created");
  };

  const onUploadSuccess = () => {
    onSuccess();
    toast.success("Upload ingestion job created");
  };

  const onUrlSuccess = () => {
    onSuccess();
    toast.success("URL ingestion job created");
  };

  const isPending =
    queryClient.isMutating(trpc.ingestJob.ingest.mutationOptions()) > 0;

  // if it's not a pro plan, check if the user has exceeded the limit
  // pro plan is unlimited with usage based billing
  const isOverLimit =
    !isProPlan(activeOrganization.plan) &&
    activeOrganization.totalPages >= activeOrganization.pagesLimit;

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

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">
              Text
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">
              Upload
            </TabsTrigger>
            <TabsTrigger value="urls" className="flex-1">
              URLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <TextForm onSuccess={onTextSuccess} />
          </TabsContent>

          <TabsContent value="upload">
            <UploadForm onSuccess={onUploadSuccess} />
          </TabsContent>

          <TabsContent value="urls">
            <UrlsForm onSuccess={onUrlSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
