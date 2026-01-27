import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { DefaultLayout } from "../components/default-layout";

export function WebhookAdded({
  email = "john@doe.com",
  organization = {
    name: "Acme, Inc",
    slug: "acme",
  },
  webhook = {
    name: "My Webhook",
  },
  domain = "https://app.agentset.ai",
}: {
  email: string;
  organization: {
    name: string;
    slug: string;
  };
  webhook: {
    name: string;
  };
  domain?: string;
}) {
  return (
    <DefaultLayout preview="New webhook added" footer={{ email, domain }}>
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        New webhook added
      </Heading>
      <Text className="text-sm leading-6 text-black">
        Webhook with the name <strong>{webhook.name}</strong> has been added to
        your Agentset organization <strong>{organization.name}</strong>.
      </Text>
      <Section className="my-6">
        <Button
          className="rounded-full bg-black px-6 py-3 text-center text-sm font-semibold text-white no-underline"
          href={`${domain}/${organization.slug}/webhooks`}
        >
          View Webhook
        </Button>
      </Section>
      <Text className="text-sm leading-6 text-black">
        If you did not create this webhook, you can{" "}
        <Link
          href={`${domain}/${organization.slug}/webhooks`}
          className="text-black underline"
        >
          <strong>delete this webhook</strong>
        </Link>{" "}
        from your account.
      </Text>
    </DefaultLayout>
  );
}

export default WebhookAdded;
