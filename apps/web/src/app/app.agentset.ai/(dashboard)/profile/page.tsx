import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { ChevronLeftIcon } from "lucide-react";

import { Separator } from "@agentset/ui/separator";

import ActiveSessions from "./active-sessions";
import EditUser from "./edit-user";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const allSessions = await auth.api.listSessions({
    headers: await headers(),
  });

  return (
    <div className="bg-background flex min-h-svh flex-col items-center p-6 pt-12 md:p-10 md:pt-16">
      <div className="w-full max-w-xl">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Back to dashboard</span>
        </Link>

        <h1 className="mb-8 text-2xl font-semibold">Profile Settings</h1>

        <section>
          <h2 className="text-lg font-medium">Account Information</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Manage your personal information and profile picture.
          </p>
          <EditUser />
        </section>

        <Separator className="my-10" />

        <section>
          <h2 className="text-lg font-medium">Active Sessions</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Manage your active sessions across different devices.
          </p>
          <ActiveSessions activeSessions={allSessions} />
        </section>
      </div>
    </div>
  );
}
