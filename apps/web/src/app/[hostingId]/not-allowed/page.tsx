"use client";

import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";

import { Button } from "@agentset/ui/button";

export default function NotAllowed() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
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

  const { session } = useSession();

  return (
    <main className="grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">403</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Unauthorized
        </h1>

        <p className="text-secondary-foreground mt-6 text-lg font-medium text-pretty sm:text-xl/8">
          Sorry, you are not authorized to access this page.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3">
          <Button onClick={handleSignOut} isLoading={isSigningOut}>
            Sign out
          </Button>

          <p className="text-muted-foreground text-sm">
            Signed in as {session?.user.email}
          </p>
        </div>
      </div>
    </main>
  );
}
