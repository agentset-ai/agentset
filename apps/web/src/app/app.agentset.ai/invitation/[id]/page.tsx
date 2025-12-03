import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AlertCircleIcon } from "lucide-react";

import { InvitationCard } from "./invitation-card";
import { InvitationStatus } from "./invitation-status";

export default async function InvitationPage({
  params,
}: PageProps<"/app.agentset.ai/invitation/[id]">) {
  const [inviteId, allHeaders] = await Promise.all([
    params.then((p) => p.id),
    headers(),
  ]);

  const redirectUrl = `/login?r=/invitation/${inviteId}`;
  const session = await auth.api
    .getSession({
      headers: allHeaders,
    })
    .catch((e) => {
      console.error(e);
      redirect(redirectUrl);
    });

  if (!session) {
    redirect(redirectUrl);
  }

  const invitation = await auth.api
    .getInvitation({
      headers: allHeaders,
      query: {
        id: inviteId,
      },
    })
    .catch(() => null);

  if (!invitation) {
    return (
      <div className="dark:bg-background flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <InvitationStatus
          icon={AlertCircleIcon}
          iconContainerClassName="bg-red-100"
          iconClassName="text-red-600"
          title="Invitation Error"
          description="The invitation you're trying to access is either invalid or you don't have the correct permissions. Please check your email for a valid invitation or contact the person who sent it."
        />
      </div>
    );
  }

  return (
    <div className="dark:bg-background flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <InvitationCard invitation={invitation} />
    </div>
  );
}
