"use client";

import { CodeBlock } from "@/components/chat/code-block";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { prefixId } from "@/lib/api/ids";
import { ArrowUpRightIcon, Code2Icon } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@agentset/ui";

export default function ApiDialog({
  variant = "outline",
  label = "API",
  description = "Use the api",
  tabs,
}: {
  variant?: "ghost" | "outline";
  label?: string;
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Code2Icon className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs>
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
              <CodeBlock>{prepareExample(tab.code)}</CodeBlock>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
