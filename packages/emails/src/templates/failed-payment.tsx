import { Heading, Section, Text } from "@react-email/components";

import { Button } from "../components/button";
import { DefaultLayout } from "../components/default-layout";
import { APP_DOMAIN } from "../domain";

export function FailedPayment({
  user = { name: "John Doe", email: "john@doe.com" },
  organization = { name: "Agentset", slug: "agentset" },
  amountDue = 49,
  attemptCount = 2,
  domain = APP_DOMAIN,
}: {
  domain?: string;
  user: { name?: string | null; email: string };
  organization: { name: string; slug: string };
  amountDue: number;
  attemptCount: number;
}) {
  const title = `${
    attemptCount == 2 ? "2nd notice: " : attemptCount == 3 ? "3rd notice: " : ""
  }Your payment for Agentset failed`;

  return (
    <DefaultLayout preview={title} footer={{ email: user.email, domain }}>
      <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
        {attemptCount == 2 ? "2nd " : attemptCount == 3 ? "3rd  " : ""}
        Failed Payment for Agentset
      </Heading>

      <Text className="text-sm leading-6 text-black">
        Hey{user.name ? `, ${user.name}` : ""}!
      </Text>

      <Text className="text-sm leading-6 text-black">
        Your payment of{" "}
        <code className="text-purple-600">${amountDue / 100}</code> for your
        Agentset organization{" "}
        <code className="text-purple-600">{organization.name}</code> has failed.
        Please update your payment information using the link below:
        {/* TODO: add link for help article */}
      </Text>

      <Section className="my-6">
        <Button href={`${domain}/${organization.slug}/settings/billing`}>
          Update payment information
        </Button>
      </Section>

      <Text className="text-sm leading-6 text-black">
        If you have any questions, feel free to respond to this email – we're
        happy to help!
      </Text>
    </DefaultLayout>
  );
}

export default FailedPayment;
