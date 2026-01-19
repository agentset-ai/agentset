"use client";

import type { WebhookProps } from "@/lib/webhook/types";
import { useCallback, useMemo, useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@agentset/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { WEBHOOK_TRIGGER_DESCRIPTIONS, WEBHOOK_TRIGGERS } from "@agentset/utils";

interface SendTestWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: WebhookProps | undefined;
}

function SendTestWebhookModal({
  open,
  onOpenChange,
  webhook,
}: SendTestWebhookModalProps) {
  const organization = useOrganization();
  const trpc = useTRPC();
  const [selectedTrigger, setSelectedTrigger] = useState<string>("");

  const sendTestMutation = useMutation(
    trpc.webhook.sendTest.mutationOptions({
      onSuccess: () => {
        toast.success("Test webhook sent");
        onOpenChange(false);
        setSelectedTrigger("");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTrigger || !webhook) {
      return;
    }

    sendTestMutation.mutate({
      organizationId: organization.id,
      webhookId: webhook.id,
      trigger: selectedTrigger as (typeof WEBHOOK_TRIGGERS)[number],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send test webhook event</DialogTitle>
          <DialogDescription>
            Choose a webhook event to send to your receiver endpoint.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
              <SelectTrigger>
                <SelectValue placeholder="Select a webhook event" />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_TRIGGERS.map((trigger) => (
                  <SelectItem key={trigger} value={trigger}>
                    {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedTrigger || sendTestMutation.isPending}
              isLoading={sendTestMutation.isPending}
            >
              Send test webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useSendTestWebhookModal({
  webhook,
}: {
  webhook: WebhookProps | undefined;
}) {
  const [showModal, setShowModal] = useState(false);

  const Modal = useCallback(() => {
    return (
      <SendTestWebhookModal
        open={showModal}
        onOpenChange={setShowModal}
        webhook={webhook}
      />
    );
  }, [showModal, webhook]);

  return useMemo(
    () => ({
      setShowModal,
      SendTestWebhookModal: Modal,
    }),
    [setShowModal, Modal],
  );
}
