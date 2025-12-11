import { cache } from "react";
import { headers } from "next/headers";
import { createApiKey } from "@/services/api-key/create";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, magicLink, organization } from "better-auth/plugins";

import { db } from "@agentset/db/client";
import { InviteUserEmail, LoginEmail, WelcomeEmail } from "@agentset/emails";

import { env } from "../env";
import { APP_DOMAIN } from "./constants";
import { sendEmail } from "./resend";
import { getBaseUrl } from "./utils";

export const makeAuth = (params?: { baseUrl: string; isHosting: boolean }) => {
  const isUsingDefaultUrl = params?.baseUrl === env.BETTER_AUTH_URL;

  return betterAuth({
    appName: "Agentset",
    database: prismaAdapter(db, {
      provider: "postgresql",
    }),
    advanced: {
      useSecureCookies: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days
    },
    ...(params
      ? {
          baseURL: params.baseUrl,
          trustedOrigins: [params.baseUrl],
        }
      : {}),
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      admin(),
      organization({
        organizationHooks: {
          async afterCreateOrganization(data) {
            // create default api key
            await createApiKey({
              organizationId: data.organization.id,
              label: "Default API Key",
              scope: "all",
            });
          },
        },
        sendInvitationEmail: async ({ email, organization, id, inviter }) => {
          const url = `${getBaseUrl()}/invitation/${id}`;
          await sendEmail({
            email,
            subject:
              "You've been invited to join an organization on Agentset.ai",
            react: InviteUserEmail({
              email,
              url,
              organizationName: organization.name,
              organizationUserEmail: inviter.user.email,
              organizationUser: inviter.user.name || null,
              domain: APP_DOMAIN,
            }),
          });
        },
      }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({
            email,
            subject: "Your Agentset login link",
            react: LoginEmail({ loginLink: url, email, domain: APP_DOMAIN }),
          });
        },
      }),
    ],
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
        allowDifferentEmails: false,
      },
    },
    user: {
      additionalFields: {
        referrerDomain: {
          type: "string",
          required: false,
        },
      },
    },
    databaseHooks: params
      ? {
          user: {
            create: {
              // TODO: track the hosting id
              before: !isUsingDefaultUrl
                ? // eslint-disable-next-line @typescript-eslint/require-await
                  async (user) => {
                    const domain = new URL(params.baseUrl).host;

                    return {
                      data: {
                        ...user,
                        referrerDomain: domain,
                      },
                    };
                  }
                : undefined,
              // only send welcome email if using default url
              after:
                isUsingDefaultUrl && !params.isHosting
                  ? async (user) => {
                      await sendEmail({
                        email: user.email,
                        subject: "Welcome to Agentset",
                        react: WelcomeEmail({
                          name: user.name || null,
                          email: user.email,
                          domain: APP_DOMAIN,
                        }),
                        variant: "marketing",
                      });
                    }
                  : undefined,
            },
          },
        }
      : undefined,
  });
};

export const auth = makeAuth();

export const getSession = cache(async (headersObj?: Headers) => {
  const session = await auth.api
    .getSession({
      headers: headersObj ?? (await headers()),
    })
    .catch(() => null);

  return session;
});
