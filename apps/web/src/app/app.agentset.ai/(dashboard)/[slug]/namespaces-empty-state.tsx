import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon, FoldersIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import type { DemoTemplate, DemoTemplateId } from "@agentset/demo";
import { DEMO_TEMPLATE_LIST } from "@agentset/demo";
import { Button } from "@agentset/ui/button";
import { Separator, SeparatorContent } from "@agentset/ui/separator";
import { Spinner } from "@agentset/ui/spinner";

function TemplateCard({
  template,
  isPending,
  isSelected,
  onSelect,
}: {
  template: DemoTemplate;
  isPending: boolean;
  isSelected: boolean;
  onSelect: (templateId: DemoTemplateId) => void;
}) {
  const Icon = template.icon;

  return (
    <Button
      variant="ghost"
      className="border-muted hover:bg-accent hover:text-accent-foreground h-full min-h-40 w-full flex-col flex-wrap items-start rounded-md border-2 px-4 py-4 text-left whitespace-normal text-black"
      onClick={() => onSelect(template.id)}
      disabled={isPending}
    >
      <Icon className="size-6" />

      <p className="mt-4">{template.name}</p>
      <p className="text-muted-foreground mt-2 mb-4 text-xs">
        {template.description}
      </p>

      <p className="mt-auto flex items-center gap-2 text-xs">
        {isSelected ? "Creating..." : "Get Started"}
        {isSelected ? (
          <Spinner className="size-3" />
        ) : (
          <ArrowRightIcon className="size-3" />
        )}
      </p>
    </Button>
  );
}

export function NamespacesEmptyState({
  createButton,
}: {
  createButton: React.ReactNode;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const organization = useOrganization();
  const [creatingTemplateId, setCreatingTemplateId] =
    useState<DemoTemplateId | null>(null);
  const queryClient = useQueryClient();

  const { mutate: createDemoNamespace, isPending: isCreatingDemo } =
    useMutation(
      trpc.namespace.createDemoNamespace.mutationOptions({
        onSuccess: (namespace) => {
          const queryKey = trpc.namespace.getOrgNamespaces.queryKey({
            slug: organization.slug,
          });
          void queryClient.invalidateQueries({ queryKey });
          router.push(`/${organization.slug}/${namespace.slug}/documents`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
        onSettled: () => {
          setCreatingTemplateId(null);
        },
      }),
    );

  const onTemplateSelect = (templateId: DemoTemplateId) => {
    if (isCreatingDemo) return;

    setCreatingTemplateId(templateId);
    logEvent("demo_template_selected", {
      templateId,
    });
    createDemoNamespace({
      orgId: organization.id,
      templateId,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-md border py-20">
      <FoldersIcon className="text-muted-foreground mb-4 size-10" />
      <h3 className="text-lg font-medium">Create your first namespace</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Create a new namespace to start uploading your data
      </p>
      <div className="mt-4">{createButton}</div>

      <Separator className="my-10 max-w-xl">
        <SeparatorContent className="uppercase">
          Or start with a template
        </SeparatorContent>
      </Separator>

      <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
        {DEMO_TEMPLATE_LIST.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onTemplateSelect}
            isPending={isCreatingDemo}
            isSelected={creatingTemplateId === template.id && isCreatingDemo}
          />
        ))}
      </div>
    </div>
  );
}
