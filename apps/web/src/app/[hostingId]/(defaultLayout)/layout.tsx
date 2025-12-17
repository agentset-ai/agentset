import type { Metadata } from "next";
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
}: LayoutProps<"/[hostingId]">): Promise<Metadata> {
  const { hostingId } = await params;
  const hosting = await getHosting(hostingId);

  if (!hosting) return {};

  return constructMetadata({
    title:
      hosting.ogTitle || hosting.title || hosting.namespace.organization.name,
    description: hosting.ogDescription || undefined,
    image: hosting.ogImage || hosting.logo || undefined,
    icons: hosting.logo
      ? [
          {
            rel: "icon",
            url: hosting.logo,
          },
        ]
      : undefined,
  });
}

export default async function CustomDomainLayout({
  params,
  children,
}: LayoutProps<"/[hostingId]">) {
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
