import * as React from "react";
import { render } from "@react-email/render";
import { afterEach, describe, expect, it, vi } from "vitest";

// The package sources are compiled with the classic JSX runtime here
vi.stubGlobal("React", React);

const loadEmails = async (appDomain: string | undefined) => {
  vi.resetModules();
  vi.stubEnv("APP_DOMAIN", appDomain);
  vi.stubEnv("RESEND_API_KEY", "re_test");

  const send = vi.fn().mockResolvedValue({ data: { id: "email_1" } });
  vi.doMock("resend", () => ({
    Resend: class {
      emails = { send };
    },
  }));

  return { emails: await import("@agentset/emails"), send };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("resend");
});

const EU_DOMAIN = "https://eu.agentset.ai";
const US_DOMAIN = "https://app.agentset.ai";

const organization = { name: "Acme", slug: "acme" };

type Emails = Awaited<ReturnType<typeof loadEmails>>["emails"];

// Templates rendered the way their callers render them (without `domain`)
const renderAll = async (emails: Emails) => ({
  otp: await render(emails.OTPEmail({ code: "123456", email: "a@b.co" })),
  webhookAdded: await render(
    emails.WebhookAddedEmail({
      email: "a@b.co",
      organization,
      webhook: { name: "hook" },
    }),
  ),
  webhookFailed: await render(
    emails.WebhookFailedEmail({
      email: "a@b.co",
      organization,
      webhook: {
        id: "wh_1",
        url: "https://example.com/hook",
        consecutiveFailures: 5,
        disableThreshold: 20,
      },
    }),
  ),
  webhookDisabled: await render(
    emails.WebhookDisabledEmail({
      email: "a@b.co",
      organization,
      webhook: {
        id: "wh_1",
        url: "https://example.com/hook",
        disableThreshold: 20,
      },
    }),
  ),
  failedPayment: await render(
    emails.FailedPayment({
      user: { email: "a@b.co" },
      organization,
      amountDue: 4900,
      attemptCount: 1,
    }),
  ),
  login: await render(
    emails.LoginEmail({ loginLink: "https://x.test/l", email: "a@b.co" }),
  ),
});

describe("email links", () => {
  it("keep today's app domain when APP_DOMAIN is unset", async () => {
    const { emails } = await loadEmails(undefined);
    const html = await renderAll(emails);

    expect(emails.APP_DOMAIN).toBe(US_DOMAIN);
    expect(html.webhookAdded).toContain(`href="${US_DOMAIN}/acme/webhooks"`);
    expect(html.webhookFailed).toContain(
      `href="${US_DOMAIN}/acme/webhooks/wh_1/edit"`,
    );
    expect(html.webhookDisabled).toContain(
      `href="${US_DOMAIN}/acme/webhooks/wh_1/edit"`,
    );
    expect(html.failedPayment).toContain(
      `href="${US_DOMAIN}/acme/settings/billing"`,
    );
  });

  it("use APP_DOMAIN when it is set", async () => {
    const { emails } = await loadEmails(EU_DOMAIN);
    const html = await renderAll(emails);

    expect(emails.APP_DOMAIN).toBe(EU_DOMAIN);
    expect(html.webhookAdded).toContain(`href="${EU_DOMAIN}/acme/webhooks"`);
    expect(html.webhookFailed).toContain(
      `href="${EU_DOMAIN}/acme/webhooks/wh_1/edit"`,
    );
    expect(html.webhookDisabled).toContain(
      `href="${EU_DOMAIN}/acme/webhooks/wh_1/edit"`,
    );
    expect(html.failedPayment).toContain(
      `href="${EU_DOMAIN}/acme/settings/billing"`,
    );

    for (const body of Object.values(html)) {
      expect(body).not.toContain("app.agentset.ai");
    }
  });

  it("prefer the domain passed by the caller", async () => {
    const { emails } = await loadEmails(undefined);

    const html = await render(
      emails.WebhookAddedEmail({
        email: "a@b.co",
        organization,
        webhook: { name: "hook" },
        domain: EU_DOMAIN,
      }),
    );

    expect(html).toContain(`href="${EU_DOMAIN}/acme/webhooks"`);
    expect(html).not.toContain("app.agentset.ai");
  });

  it("accept a domain on the OTP email", async () => {
    const { emails } = await loadEmails(undefined);

    const withDomain = await render(
      emails.OTPEmail({ code: "123456", email: "a@b.co", domain: EU_DOMAIN }),
    );
    const withoutDomain = await render(
      emails.OTPEmail({ code: "123456", email: "a@b.co" }),
    );

    expect(withDomain).toContain("123456");
    expect(withDomain).toBe(withoutDomain);
  });

  it.each([
    ["unset", undefined, US_DOMAIN],
    ["set", EU_DOMAIN, EU_DOMAIN],
  ])(
    "default the OTP footer domain to APP_DOMAIN (%s)",
    async (_label, appDomain, expected) => {
      const { emails } = await loadEmails(appDomain);

      // rendered the way auth.ts renders it
      const element = emails.OTPEmail({ code: "123456", email: "a@b.co" });

      expect((element.props as { footer: unknown }).footer).toEqual({
        email: "a@b.co",
        domain: expected,
      });
    },
  );

  it.each([
    ["unset", undefined, US_DOMAIN],
    ["set", EU_DOMAIN, EU_DOMAIN],
  ])(
    "point the unsubscribe header at the app domain (APP_DOMAIN %s)",
    async (_label, appDomain, expected) => {
      const { emails, send } = await loadEmails(appDomain);

      await emails.sendEmail({
        email: "a@b.co",
        subject: "Hi",
        text: "Hi",
        variant: "marketing",
      });

      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Abdellatif from Agentset.ai <contact@agentset.ai>",
          headers: { "List-Unsubscribe": `${expected}/account/settings` },
        }),
      );
    },
  );
});
