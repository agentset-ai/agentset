"use client";

import { DeleteConfirmation } from "@/components/delete-confirmation";
import { TrashIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@agentset/ui/card";
import { cn } from "@agentset/ui/cn";

// import { Skeleton } from "@agentset/ui/skeleton";

// Mock data for connectors
const mockConnectors = [
  {
    id: "1",
    name: "Google Drive",
    type: "google_drive",
    status: "connected",
    lastSync: "2024-03-20T10:00:00Z",
  },
  {
    id: "2",
    name: "AWS S3",
    type: "s3",
    status: "connected",
    lastSync: "2024-03-19T15:30:00Z",
  },
  {
    id: "3",
    name: "Dropbox",
    type: "dropbox",
    status: "disconnected",
    lastSync: "2024-03-18T12:00:00Z",
  },
];

export default function ConnectorsPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* <ConnectorSkeleton />
      <ConnectorSkeleton />
      <ConnectorSkeleton /> */}

      {mockConnectors.map((connector) => (
        <Card key={connector.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{connector.name}</CardTitle>
              <CardDescription>
                Last synced: {new Date(connector.lastSync).toLocaleString()}
              </CardDescription>
            </div>

            <DeleteConfirmation
              trigger={
                <Button variant="ghost" size="icon">
                  <TrashIcon className="h-4 w-4" />{" "}
                </Button>
              }
              confirmText={connector.name}
              onConfirm={() => {
                console.log("delete connector");
              }}
            />
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "size-2 rounded-full",
                  connector.status === "connected"
                    ? "bg-green-500"
                    : "bg-red-500",
                )}
              />
              <span className="text-muted-foreground text-sm capitalize">
                {connector.status}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// const ConnectorSkeleton = () => {
//   return (
//     <Card>
//       <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
//         <div className="flex flex-col">
//           <Skeleton className="h-4 w-24" />

//           <CardDescription className="mt-1">
//             <Skeleton className="h-4 w-48" />
//           </CardDescription>
//         </div>

//         <Skeleton className="h-6 w-6" />
//       </CardHeader>

//       <CardContent>
//         <div className="flex items-center space-x-2">
//           <Skeleton className="h-2 w-2 rounded-full" />
//           <Skeleton className="h-2 w-24 rounded-full" />
//         </div>
//       </CardContent>
//     </Card>
//   );
// };
