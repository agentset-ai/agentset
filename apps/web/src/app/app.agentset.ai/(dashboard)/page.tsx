import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

import { db, OrganizationStatus } from "@agentset/db";

export default async function DashboardRootPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const organizations = await db.organization.findMany({
    where: {
      status: OrganizationStatus.ACTIVE,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (organizations.length === 0) {
    redirect("/create-organization");
  }

  const activeOrgId = session.session.activeOrganizationId;
  const activeOrg = activeOrgId
    ? organizations.find((org) => org.id === activeOrgId)
    : null;

  const org = activeOrg ?? organizations[0];
  if (!org) {
    redirect("/create-organization");
  }

  redirect(`/${org.slug}`);

  return <div>SHOULD BE REDIRECTED</div>;
}
