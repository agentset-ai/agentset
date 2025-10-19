import { BuildingIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@agentset/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@agentset/ui/card";
import { Skeleton } from "@agentset/ui/skeleton";

export default function InvitationLoading() {
  return (
    <div className="dark:bg-background flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>
                <BuildingIcon className="size-5" />
              </AvatarFallback>
            </Avatar>

            <div>
              <CardTitle className="text-xl">Organization Invitation</CardTitle>
              <CardDescription>
                You've been invited to join an organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-4 space-y-2">
              <Skeleton className="h-4 w-1/2" />

              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <Skeleton className="h-4 w-14" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invited by</span>
                <Skeleton className="h-4 w-30" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <Skeleton className="h-4 w-30" />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-2">
          <Skeleton className="h-9 w-24" />

          <Skeleton className="h-9 w-36" />
        </CardFooter>
      </Card>
    </div>
  );
}
