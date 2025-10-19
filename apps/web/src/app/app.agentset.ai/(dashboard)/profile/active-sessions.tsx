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

import { Button } from "@agentset/ui/button";

const SessionItem = ({ session }: { session: Session["session"] }) => {
  const { session: activeSession } = useSession();
  const router = useRouter();

  const parsedAgent = useMemo(
    () => new UAParser(session.userAgent || ""),
    [session.userAgent],
  );
  const isCurrentSession = session.id === activeSession?.session.id;

  const { mutateAsync: terminateSession, isPending: isTerminating } =
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
        toast.success("Session terminated successfully");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  return (
    <div key={session.id}>
      <div className="flex items-center justify-between gap-2 font-medium text-black dark:text-white">
        <p className="flex items-center gap-2">
          {parsedAgent.getDevice().type === "mobile" ? (
            <SmartphoneIcon className="h-4 w-4" />
          ) : (
            <LaptopIcon className="h-4 w-4" />
          )}
          {parsedAgent.getOS().name}, {parsedAgent.getBrowser().name}{" "}
          {isCurrentSession && <span>(Current)</span>}
        </p>

        <Button
          variant="destructive"
          size="sm"
          isLoading={isTerminating}
          onClick={() => terminateSession()}
        >
          {isCurrentSession ? "Sign Out" : "Terminate"}
        </Button>
      </div>
    </div>
  );
};

export default function ActiveSessions({
  activeSessions,
}: {
  activeSessions: Session["session"][];
}) {
  return (
    <div className="mt-20 flex max-w-xl flex-col gap-5">
      <p className="text-lg font-medium">Active Sessions</p>
      <ul className="flex flex-col gap-2">
        {activeSessions
          .filter((session) => session.userAgent)
          .map((session) => {
            return <SessionItem key={session.id} session={session} />;
          })}
      </ul>
    </div>
  );
}
