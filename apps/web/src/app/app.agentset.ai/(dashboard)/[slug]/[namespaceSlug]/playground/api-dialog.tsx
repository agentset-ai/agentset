"use client";

import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { prefixId } from "@/lib/api/ids";
import { ArrowUpRightIcon } from "lucide-react";

import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@agentset/ui/tabs";

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
    title: string;
    code: string;
  }[];
}) {
  const namespace = useNamespace();
  const organization = useOrganization();

  const prepareExample = (example: string) => {
    const id = prefixId(namespace.id, "ns_");
    return example.replace("{{namespace}}", id).trim();
  };

  if (organization.isLoading || namespace.isLoading)
    return trigger({ disabled: true });

  return (
    <Dialog>
      <DialogTrigger asChild disabled>
        {trigger({ disabled: false })}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs className="max-w-full overflow-x-auto">
          <div className="flex items-center justify-between">
            <TabsList className="my-3">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.title} value={tab.title}>
                  {tab.title}
                </TabsTrigger>
              ))}
            </TabsList>

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

          {tabs.map((tab) => (
            <TabsContent key={tab.title} value={tab.title}>
              <CodeBlock code={prepareExample(tab.code)} language="typescript">
                <CodeBlockCopyButton />
              </CodeBlock>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
