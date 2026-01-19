"use client";

import type { WebhookProps } from "@/lib/webhook/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Button } from "@agentset/ui/button";
import { Checkbox } from "@agentset/ui/checkbox";
import { CopyButton } from "@agentset/ui/copy-button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { Separator } from "@agentset/ui/separator";
import {
  DOCUMENT_LEVEL_WEBHOOK_TRIGGERS,
  INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WEBHOOK_TRIGGERS,
} from "@agentset/utils";

const webhookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(40, "Name is too long"),
  url: z.url("Please enter a valid URL"),
  triggers: z
    .array(z.enum(WEBHOOK_TRIGGERS))
    .min(1, "Select at least one trigger"),
  namespaceIds: z.array(z.string()).optional(),
});

type WebhookFormValues = z.infer<typeof webhookFormSchema>;

interface AddEditWebhookFormProps {
  organizationId: string;
  organizationSlug: string;
  webhook?: WebhookProps & {
    consecutiveFailures?: number;
    lastFailedAt?: Date | null;
    createdAt?: Date;
  };
}

export default function AddEditWebhookForm({
  organizationId,
  organizationSlug,
  webhook,
}: AddEditWebhookFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const isEditing = !!webhook;

  const [testTrigger, setTestTrigger] = useState<string>("");

  const form = useZodForm(webhookFormSchema, {
    defaultValues: {
      name: webhook?.name || "",
      url: webhook?.url || "",
      triggers: (webhook?.triggers as WebhookFormValues["triggers"]) || [],
      namespaceIds: webhook?.namespaceIds || [],
    },
  });

  const { data: namespaces } = useQuery(
    trpc.webhook.getNamespaces.queryOptions({ organizationId }),
  );

  const createMutation = useMutation(
    trpc.webhook.create.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook created");
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.list.queryKey({ organizationId }),
        });
        router.push(`/${organizationSlug}/webhooks`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.webhook.update.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook updated");
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.list.queryKey({ organizationId }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.get.queryKey({
            organizationId,
            webhookId: webhook!.id,
          }),
        });
        router.push(`/${organizationSlug}/webhooks/${webhook!.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const regenerateSecretMutation = useMutation(
    trpc.webhook.regenerateSecret.mutationOptions({
      onSuccess: () => {
        toast.success("Secret regenerated");
        queryClient.invalidateQueries({
          queryKey: trpc.webhook.get.queryKey({
            organizationId,
            webhookId: webhook!.id,
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const sendTestMutation = useMutation(
    trpc.webhook.sendTest.mutationOptions({
      onSuccess: () => {
        toast.success("Test webhook sent");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const onSubmit = (data: WebhookFormValues) => {
    const payload = {
      ...data,
      namespaceIds: data.namespaceIds?.length ? data.namespaceIds : undefined,
    };

    if (isEditing) {
      updateMutation.mutate({
        ...payload,
        organizationId,
        webhookId: webhook.id,
      });
    } else {
      createMutation.mutate({
        ...payload,
        organizationId,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const triggers = form.watch("triggers");

  const toggleTrigger = (trigger: (typeof WEBHOOK_TRIGGERS)[number]) => {
    const current = form.getValues("triggers");
    const updated = current.includes(trigger)
      ? current.filter((t) => t !== trigger)
      : [...current, trigger];
    form.setValue("triggers", updated, { shouldValidate: true });
  };

  const toggleNamespace = (namespaceId: string) => {
    const current = form.getValues("namespaceIds") || [];
    const updated = current.includes(namespaceId)
      ? current.filter((id) => id !== namespaceId)
      : [...current, namespaceId];
    form.setValue("namespaceIds", updated);
  };

  const selectedNamespaces = form.watch("namespaceIds") || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        {/* Basic Information */}
        <section>
          <div>
            <h2 className="text-lg font-medium">Basic Information</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure the basic details for your webhook endpoint
            </p>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Webhook" maxLength={40} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/webhook"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && webhook?.secret && (
              <div className="space-y-2">
                <FormLabel>Signing Secret</FormLabel>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <code className="font-mono text-sm">{webhook.secret}</code>
                  <div className="flex items-center">
                    <CopyButton textToCopy={webhook.secret} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        regenerateSecretMutation.mutate({
                          organizationId,
                          webhookId: webhook.id,
                        })
                      }
                      disabled={regenerateSecretMutation.isPending}
                    >
                      <RefreshCwIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Use this secret to verify webhook signatures.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Events */}
        <section>
          <div>
            <h2 className="text-lg font-medium">Events</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Select the events that will trigger this webhook
            </p>
          </div>

          <Separator className="my-4" />

          <FormField
            control={form.control}
            name="triggers"
            render={() => (
              <FormItem>
                <div className="flex flex-col gap-4">
                  {/* Document Events */}
                  <div className="rounded-lg border p-4">
                    <div className="mb-3">
                      <h3 className="font-medium">Document Events</h3>
                      <p className="text-muted-foreground text-xs">
                        Triggered when documents are processed
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {DOCUMENT_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => (
                        <div key={trigger} className="group flex gap-2">
                          <Checkbox
                            id={trigger}
                            checked={triggers.includes(trigger)}
                            onCheckedChange={() => toggleTrigger(trigger)}
                          />
                          <label
                            htmlFor={trigger}
                            className="text-muted-foreground group-hover:text-foreground cursor-pointer text-sm select-none"
                          >
                            {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ingest Job Events */}
                  <div className="rounded-lg border p-4">
                    <div className="mb-3">
                      <h3 className="font-medium">Ingest Job Events</h3>
                      <p className="text-muted-foreground text-xs">
                        Triggered when ingest jobs change state
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => (
                        <div key={trigger} className="group flex gap-2">
                          <Checkbox
                            id={trigger}
                            checked={triggers.includes(trigger)}
                            onCheckedChange={() => toggleTrigger(trigger)}
                          />
                          <label
                            htmlFor={trigger}
                            className="text-muted-foreground group-hover:text-foreground cursor-pointer text-sm select-none"
                          >
                            {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <FormMessage className="mt-2" />
              </FormItem>
            )}
          />
        </section>

        {/* Namespace Filter */}
        {namespaces && namespaces.length > 0 && (
          <section>
            <div>
              <h2 className="text-lg font-medium">Namespace Filter</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Optionally limit events to specific namespaces
              </p>
            </div>

            <Separator className="my-4" />

            <FormField
              control={form.control}
              name="namespaceIds"
              render={() => (
                <FormItem>
                  <div className="rounded-lg border p-4">
                    <div className="mb-3">
                      <p className="text-muted-foreground text-xs">
                        Leave all unchecked to receive events from all
                        namespaces
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {namespaces.map((namespace) => (
                        <div key={namespace.id} className="group flex gap-2">
                          <Checkbox
                            id={`ns-${namespace.id}`}
                            checked={selectedNamespaces.includes(namespace.id)}
                            onCheckedChange={() =>
                              toggleNamespace(namespace.id)
                            }
                          />
                          <label
                            htmlFor={`ns-${namespace.id}`}
                            className="text-muted-foreground group-hover:text-foreground cursor-pointer text-sm select-none"
                          >
                            {namespace.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
        )}

        {/* Test Webhook */}
        {isEditing && (
          <section>
            <div>
              <h2 className="text-lg font-medium">Test Webhook</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Send a test event to verify your endpoint
              </p>
            </div>

            <Separator className="my-4" />

            <div className="flex gap-2">
              <Select value={testTrigger} onValueChange={setTestTrigger}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select an event type" />
                </SelectTrigger>
                <SelectContent>
                  {WEBHOOK_TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger} value={trigger}>
                      {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!testTrigger || sendTestMutation.isPending}
                onClick={() =>
                  sendTestMutation.mutate({
                    organizationId,
                    webhookId: webhook.id,
                    trigger: testTrigger as (typeof WEBHOOK_TRIGGERS)[number],
                  })
                }
              >
                <SendIcon className="mr-1.5 h-4 w-4" />
                Send
              </Button>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isPending} isLoading={isPending}>
            {isEditing ? "Save Changes" : "Create Webhook"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
