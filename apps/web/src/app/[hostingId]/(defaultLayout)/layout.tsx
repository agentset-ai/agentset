import { cache } from "react";
import { notFound } from "next/navigation";
import { HostingProvider } from "@/contexts/hosting-context";
import { constructMetadata } from "@/lib/metadata";

import { db } from "@agentset/db/client";

import Header from "./header";

const getHosting = cache(async (id: string) => {
  return await db.hosting.findFirst({
    where: {
      id,
    },
    include: {
      namespace: {
        select: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hostingId: string }>;
}) {
  const { hostingId } = await params;
  const hosting = await getHosting(hostingId);

  if (!hosting) return {};

  return constructMetadata({ title: hosting.namespace.organization.name });
}

export default async function CustomDomainLayout({
  params,
  children,
}: {
  params: Promise<{ hostingId: string }>;
  children: React.ReactNode;
}) {
  const { hostingId } = await params;
  const hosting = await getHosting(hostingId);

  if (!hosting) notFound();

  return (
    <HostingProvider hosting={hosting}>
      <div>
        <Header />
        {children}
      </div>
    </HostingProvider>
  );
}
