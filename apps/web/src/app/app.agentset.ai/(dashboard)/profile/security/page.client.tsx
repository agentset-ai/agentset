"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { Session } from "@/lib/auth-types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LaptopIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { UAParser } from "ua-parser-js";

import { Button } from "@agentset/ui/button";
import { Card, CardContent } from "@agentset/ui/card";
import { DataWrapper } from "@agentset/ui/data-wrapper";
import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";

export default function PageClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () =>
      authClient
        .listSessions({ fetchOptions: { throw: true } })
        .then((r) => r.filter((session) => !!session.userAgent)),
  });

  return (
    <div>
      <div>
        <h2 className="text-xl font-medium">Sessions</h2>
        <p className="text-muted-foreground mt-1 text-sm text-balance">
          Manage your active sessions and revoke access.
        </p>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-4">
        <DataWrapper
          data={data}
          isLoading={isLoading}
          emptyState={null}
          loadingState={
            <>
              <Skeleton className="h-17.5 w-full" />
              <Skeleton className="h-17.5 w-full" />
              <Skeleton className="h-17.5 w-full" />
            </>
          }
        >
          {(data) =>
            data.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))
          }
        </DataWrapper>
      </div>
    </div>
  );
}

const SessionItem = ({ session }: { session: Session["session"] }) => {
  const { session: activeSession } = useSession();
  const router = useRouter();

  const parsedAgent = useMemo(
    () => new UAParser(session.userAgent!),
    [session.userAgent],
  );
  const isCurrentSession = session.id === activeSession?.session.id;

  const { mutateAsync: terminateSession, isPending: isTerminating } =
    useMutation({
      mutationFn: async () => {
        if (isCurrentSession) {
          await authClient.signOut({
            fetchOptions: { throw: true },
          });
          return "current";
        }

        return authClient.revokeSession({
          token: session.token,
          fetchOptions: { throw: true },
        });
      },
      onSuccess: (data) => {
        if (data === "current") {
          router.push("/login");
          return;
        }
        toast.success("Session terminated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const Icon =
    parsedAgent.getDevice().type === "mobile" ? SmartphoneIcon : LaptopIcon;

  return (
    <Card className="py-3">
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="size-5 shrink-0" />
          <div>
            <p className="text-base font-semibold">
              {isCurrentSession ? "Current" : session.ipAddress}
            </p>

            <p className="text-muted-foreground text-sm">
              {parsedAgent.getOS().name}, {parsedAgent.getBrowser().name}
            </p>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          isLoading={isTerminating}
          onClick={() => terminateSession()}
        >
          {isCurrentSession ? "Sign Out" : "Terminate"}
        </Button>
      </CardContent>
    </Card>
  );
};
