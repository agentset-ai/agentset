import { useState, useTransition } from "react";
import { useParams, usePathname } from "next/navigation";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";

import type { Namespace } from "@agentset/db/browser";
import { Button } from "@agentset/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";
import { Skeleton } from "@agentset/ui/skeleton";

import CreateNamespaceDialog from "../create-namespace";

function NamespaceSwitcherSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="size-3" />
    </div>
  );
}

export const NamespaceSwitcher = () => {
  const namespace = useNamespace();
  const organization = useOrganization();
  const router = useRouter();

  const params = useParams();
  const orgSlug = params.slug as string;

  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trpc = useTRPC();
  const { data: namespaces, isLoading } = useQuery(
    trpc.namespace.getOrgNamespaces.queryOptions({
      slug: orgSlug,
    }),
  );

  if (namespace.isLoading) {
    return <NamespaceSwitcherSkeleton />;
  }

  const handleNamespaceChange = (newNamespace: Namespace) => {
    const relativePath = pathname.replace(
      `/${orgSlug}/${namespace.slug}`,
      `/${orgSlug}/${newNamespace.slug}`,
    );

    startTransition(() => {
      router.push(relativePath);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading || isPending}>
          <Button
            variant="ghost"
            className="focus-visible:bg-accent text-foreground h-8 px-0! focus-visible:ring-0"
          >
            <span className="text-muted-foreground truncate text-sm font-medium">
              {namespace.name}
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground/80 size-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          {namespaces?.map((namespace) => (
            <DropdownMenuItem
              className="gap-2 p-2"
              key={namespace.id}
              onClick={() => handleNamespaceChange(namespace)}
            >
              <p>{namespace.name}</p>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="gap-2 p-2"
            onClick={() => setOpen(true)}
            disabled={organization.isLoading}
          >
            <PlusIcon className="size-4" />

            <div className="text-muted-foreground font-medium">
              New Namespace
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {organization && (
        <CreateNamespaceDialog
          organization={organization}
          open={open}
          setOpen={setOpen}
        />
      )}
    </>
  );
};
