import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRightIcon } from "lucide-react";

import { CodeBlock, MultiLanguageCodeBlock } from "@agentset/ui/ai/code-block";
import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { prefixId } from "@agentset/utils";

export default function ApiDialog({
  trigger,
  title = "API",
  description = "Use the api",
  tabs,
}: {
  trigger: (props: { disabled: boolean }) => React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  tabs: {
    language: React.ComponentProps<typeof CodeBlock>["language"];
    title?: string;
    code: (apiKey?: string) => string;
  }[];
}) {
  const namespace = useNamespace();
  const organization = useOrganization();
  const trpc = useTRPC();

  const { data: defaultApiKey } = useQuery(
    trpc.apiKey.getDefaultApiKey.queryOptions(
      { orgId: organization.id },
      { enabled: !organization.isLoading },
    ),
  );

  const prepareExample = (example: (apiKey?: string) => string) => {
    const id = prefixId(namespace.id, "ns_");
    return example(defaultApiKey ?? undefined)
      .replace("{{namespace}}", id)
      .trim();
  };

  if (organization.isLoading || namespace.isLoading)
    return trigger({ disabled: true });

  return (
    <Dialog>
      <DialogTrigger asChild disabled>
        {trigger({ disabled: false })}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" scrollableOverlay>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!defaultApiKey && (
          <div className="flex items-center justify-end">
            <Button asChild size="sm">
              <a
                href={`/${organization.slug}/settings/api-keys`}
                target="_blank"
              >
                <ArrowUpRightIcon className="size-4" />
                Create API Key
              </a>
            </Button>
          </div>
        )}

        <MultiLanguageCodeBlock
          languages={tabs.map((tab) => ({
            code: prepareExample(tab.code),
            language: tab.language,
            title: tab.title,
          }))}
        />
      </DialogContent>
    </Dialog>
  );
}
