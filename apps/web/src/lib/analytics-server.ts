import { NextRequest } from "next/server";
import { env } from "@/env";
import { waitUntil } from "@vercel/functions";
import { PostHog } from "posthog-node";

import { prefixId } from "./api/ids";

const posthog = env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: "https://us.i.posthog.com",
    })
  : null;

type Organization = {
  id: string;
  name: string;
  plan: string;
};

export const identifyOrganization = ({ id, name, plan }: Organization) => {
  if (!posthog) return;
  posthog.groupIdentify({
    groupType: "organization",
    groupKey: id,
    properties: { name, plan },
    distinctId: `api:${prefixId(id, "org_")}`,
  });
};

export const logServerEvent = (
  event: string,
  {
    organization,
    routeName,
    request,
    response,
  }: {
    organization: Organization;
    routeName: string;
    request?: NextRequest;
    response?: Response;
  },
  properties?: {
    tenantId?: string;
    namespaceId?: string;
  } & Record<string, any>,
) => {
  if (!posthog) return;
  posthog.capture({
    distinctId: `api:${prefixId(organization.id, "org_")}`,
    event,
    properties: {
      ...properties,
      routeName,
      ...(request
        ? {
            pathname: request.nextUrl.pathname,
            method: request.method,
          }
        : {}),
      ...(response ? { statusCode: response.status } : {}),
    },
    groups: {
      organization: organization.id,
    },
  });
};

export const flushServerEvents = () => {
  if (!posthog) return;
  return waitUntil(posthog.shutdown().catch((err) => console.error(err)));
};
