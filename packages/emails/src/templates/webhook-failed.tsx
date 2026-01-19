import { Button, Heading, Section, Text } from "@react-email/components";

import { DefaultLayout } from "../components/default-layout";

export function WebhookFailed({
  email = "john@doe.com",
  organization = {
    name: "Acme, Inc",
    slug: "acme",
  },
  webhook = {
    id: "wh_abc123",
    url: "https://example.com/webhook",
    consecutiveFailures: 15,
    disableThreshold: 20,
  },
  domain = "https://app.agentset.ai",
}: {
  email: string;
  organization: {
    name: string;
    slug: string;
  };
  webhook: {
    id: string;
    url: string;
    consecutiveFailures: number;
    disableThreshold: number;
  };
  domain?: string;
}) {
  return (
    <DefaultLayout
      preview="Webhook is failing to deliver"
      footer={{ email, domain }}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Webhook is failing to deliver
      </Heading>
      <Text className="text-sm leading-6 text-black">
        Your webhook <strong>{webhook.url}</strong> has failed to deliver{" "}
        {webhook.consecutiveFailures} times and will be disabled after{" "}
        {webhook.disableThreshold} consecutive failures.
      </Text>
      <Text className="text-sm leading-6 text-black">
        Please review the webhook details and update the URL if necessary to
        restore functionality.
      </Text>
      <Section className="my-6">
        <Button
          className="rounded-full bg-black px-6 py-3 text-center text-sm font-semibold text-white no-underline"
          href={`${domain}/${organization.slug}/webhooks/${webhook.id}/edit`}
        >
          Edit Webhook
        </Button>
      </Section>
    </DefaultLayout>
  );
}

export default WebhookFailed;
