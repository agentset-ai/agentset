"use client";

import { useRouter } from "next/navigation";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Button } from "@agentset/ui/button";
import { Checkbox } from "@agentset/ui/checkbox";
import { CopyButton } from "@agentset/ui/copy-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@agentset/ui/tooltip";
import {
  DOCUMENT_LEVEL_WEBHOOK_TRIGGERS,
  INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WEBHOOK_TRIGGERS,
  type WebhookProps,
} from "@agentset/webhooks";

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-20">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="My Webhook"
                  maxLength={40}
                  autoFocus
                  autoComplete="off"
                  {...field}
                />
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
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/webhook"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && webhook?.secret && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FormLabel>Signing secret</FormLabel>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3.5 text-neutral-400" />
                </TooltipTrigger>
                <TooltipContent>
                  A secret token used to sign the webhook payload.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
              <code className="text-nowrap font-mono text-sm text-neutral-500">
                {webhook.secret}
              </code>
              <div className="flex items-center gap-1">
                <CopyButton textToCopy={webhook.secret} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    regenerateSecretMutation.mutate({
                      organizationId,
                      webhookId: webhook.id,
                    })
                  }
                  disabled={regenerateSecretMutation.isPending}
                >
                  <RefreshCwIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="triggers"
          render={() => (
            <FormItem>
              <div className="space-y-4">
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="mb-3 flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Document events
                    </h3>
                    <span className="text-xs text-neutral-500">
                      Triggered when documents are processed.
                    </span>
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
                          className="cursor-pointer text-sm text-neutral-600 select-none group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-200"
                        >
                          {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="mb-3 flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Ingest job events
                    </h3>
                    <span className="text-xs text-neutral-500">
                      Triggered when ingest jobs change state.
                    </span>
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
                          className="cursor-pointer text-sm text-neutral-600 select-none group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-200"
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

        {namespaces && namespaces.length > 0 && (
          <FormField
            control={form.control}
            name="namespaceIds"
            render={() => (
              <FormItem>
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="mb-3 flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Namespace filter
                    </h3>
                    <span className="text-xs text-neutral-500">
                      Leave all unchecked to receive events from all namespaces.
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {namespaces.map((namespace) => (
                      <div key={namespace.id} className="group flex gap-2">
                        <Checkbox
                          id={`ns-${namespace.id}`}
                          checked={selectedNamespaces.includes(namespace.id)}
                          onCheckedChange={() => toggleNamespace(namespace.id)}
                        />
                        <label
                          htmlFor={`ns-${namespace.id}`}
                          className="cursor-pointer text-sm text-neutral-600 select-none group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-200"
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
        )}

        <Button type="submit" disabled={isPending} isLoading={isPending}>
          {isEditing ? "Save changes" : "Create webhook"}
        </Button>
      </form>
    </Form>
  );
}
