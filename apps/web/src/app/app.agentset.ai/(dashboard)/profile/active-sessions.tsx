"use client";

import type { Session } from "@/lib/auth-types";
import { useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";
import { useMutation } from "@tanstack/react-query";
import { LaptopIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { UAParser } from "ua-parser-js";

import { Badge } from "@agentset/ui/badge";
import { Button } from "@agentset/ui/button";

const SessionItem = ({ session }: { session: Session["session"] }) => {
  const { session: activeSession } = useSession();
  const router = useRouter();

  const parsedAgent = useMemo(
    () => new UAParser(session.userAgent || ""),
    [session.userAgent],
  );
  const isCurrentSession = session.id === activeSession?.session.id;

  const { mutateAsync: revokeOtherSession, isPending: isRevoking } =
    useMutation({
      mutationFn: async () => {
        const res = await authClient.revokeSession({
          token: session.token,
        });

        if (res.error) {
          throw new Error(res.error.message);
        }

        return res.data;
      },
      onSuccess: () => {
        toast.success("Session revoked successfully");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutateAsync: signOutCurrentSession, isPending: isSigningOut } =
    useMutation({
      mutationFn: async () => {
        await authClient.signOut({
          fetchOptions: {
            onSuccess() {
              router.replace("/login");
            },
          },
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to sign out");
      },
    });

  const handleTerminate = () => {
    if (isCurrentSession) {
      signOutCurrentSession();
    } else {
      revokeOtherSession();
    }
  };

  const isTerminating = isCurrentSession ? isSigningOut : isRevoking;

  return (
    <li className="border-border flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-10 items-center justify-center rounded-full">
          {parsedAgent.getDevice().type === "mobile" ? (
            <SmartphoneIcon className="text-muted-foreground size-5" />
          ) : (
            <LaptopIcon className="text-muted-foreground size-5" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">
              {parsedAgent.getBrowser().name || "Unknown Browser"}
            </span>
            {isCurrentSession && (
              <Badge variant="secondary" className="text-xs">
                Current
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {parsedAgent.getOS().name || "Unknown OS"}
          </span>
        </div>
      </div>

      <Button
        variant={isCurrentSession ? "destructive" : "outline"}
        size="sm"
        isLoading={isTerminating}
        onClick={handleTerminate}
      >
        {isCurrentSession ? "Sign Out" : "Revoke"}
      </Button>
    </li>
  );
};

export default function ActiveSessions({
  activeSessions,
}: {
  activeSessions: Session["session"][];
}) {
  const filteredSessions = activeSessions.filter(
    (session) => session.userAgent,
  );

  if (filteredSessions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No active sessions found.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {filteredSessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </ul>
  );
}
