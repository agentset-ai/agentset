import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";

import { Button } from "@agentset/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@agentset/ui/card";

import "@dnd-kit/core";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, LockIcon, PaintbrushIcon } from "lucide-react";
import { toast } from "sonner";

export function EmptyState() {
  const namespace = useNamespace();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutate: enableHosting, isPending } = useMutation(
    trpc.hosting.enable.mutationOptions({
      onSuccess: (hosting) => {
        logEvent("hosting_enabled", {
          namespaceId: namespace.id,
        });
        toast.success("Hosting enabled successfully");
        queryClient.setQueryData(
          trpc.hosting.get.queryKey({ namespaceId: namespace.id }),
          () => {
            return { ...hosting, domain: null };
          },
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = () => {
    enableHosting({
      namespaceId: namespace.id,
    });
  };

  return (
    <div className="border-border w-full rounded-md border px-12 pt-24 pb-12">
      <div className="relative">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-semibold"> Host Your AI Assistant</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Deploy your AI assistant to a custom domain and share it with your
            users
          </p>
        </div>

        <div className="mt-5 flex justify-center">
          <Button size="lg" isLoading={isPending} onClick={handleSubmit}>
            Enable
          </Button>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <GlobeIcon className="text-muted-foreground size-6" />
              <CardTitle className="mt-3">Custom Domain</CardTitle>
              <CardDescription>
                Deploy your AI assistant to your own domain
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <LockIcon className="text-muted-foreground size-6" />
              <CardTitle className="mt-3">Authentication</CardTitle>
              <CardDescription>
                Optional user authentication and access control
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <PaintbrushIcon className="text-muted-foreground size-6" />
              <CardTitle className="mt-3">Custom Branding</CardTitle>
              <CardDescription>
                Maintain your brand identity with custom styling
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
