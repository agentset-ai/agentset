"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";
import { BadgeCheckIcon, LogOutIcon } from "lucide-react";

import { EntityAvatar } from "@agentset/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@agentset/ui/dropdown-menu";
import { Skeleton } from "@agentset/ui/skeleton";

export function NavUser() {
  const { session, isLoading } = useSession();

  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess() {
          router.replace("/");
        },
      },
    });
    setIsSigningOut(false);
  };

  if (isLoading || !session)
    return (
      <Skeleton className="size-8 rounded-full border-2 border-transparent" />
    );

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="border-border overflow-hidden rounded-full border-2 data-[state=open]:border-black">
          <EntityAvatar
            entity={user}
            fallbackClassName="bg-muted text-foreground "
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <EntityAvatar
              entity={user}
              fallbackClassName="bg-muted text-foreground"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              {user.name ? (
                <>
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </>
              ) : (
                <span className="truncate font-semibold">{user.email}</span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile">
            <BadgeCheckIcon />
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
