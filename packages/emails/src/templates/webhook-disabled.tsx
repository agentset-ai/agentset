import { Button, Heading, Section, Text } from "@react-email/components";

import { DefaultLayout } from "../components/default-layout";

export function WebhookDisabled({
  email = "john@doe.com",
  organization = {
    name: "Acme, Inc",
    slug: "acme",
  },
  webhook = {
    id: "wh_abc123",
    url: "https://example.com/webhook",
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
    disableThreshold: number;
  };
  domain?: string;
}) {
  return (
    <DefaultLayout
      preview="Webhook has been disabled"
      footer={{ email, domain }}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Webhook has been disabled
      </Heading>
      <Text className="text-sm leading-6 text-black">
        Your webhook <strong>{webhook.url}</strong> has failed to deliver
        successfully {webhook.disableThreshold} times in a row and has been
        deactivated to prevent further issues.
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

export default WebhookDisabled;
