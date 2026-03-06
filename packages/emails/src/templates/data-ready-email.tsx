import { Heading, Section, Text } from "@react-email/components";

import { Button } from "../components/button";
import { DefaultLayout } from "../components/default-layout";

export function DataReadyEmail({
  email = "john@doe.com",
  namespace = {
    name: "My Namespace",
    slug: "my-namespace",
  },
  organization = {
    name: "Acme, Inc",
    slug: "acme",
  },
  domain = "https://app.agentset.ai",
}: {
  email: string;
  namespace: {
    name: string;
    slug: string;
  };
  organization: {
    name: string;
    slug: string;
  };
  domain?: string;
}) {
  return (
    <DefaultLayout preview="Your data is ready!" footer={{ email, domain }}>
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Your data is ready!
      </Heading>

      <Text className="text-sm leading-6 text-black">
        <strong>{namespace.name}</strong> on{" "}
        <a href="https://agentset.ai" className="text-black underline">
          agentset.ai
        </a>{" "}
        just finished building your data.
      </Text>

      <Text className="text-sm leading-6 text-black">
        Jump in and start chatting. Tell your namespace what you want to find,
        and get answers from your documents.
      </Text>

      <Text className="text-sm leading-6 text-black">
        A few tips to get you started:
      </Text>

      <Text className="ml-1 text-sm leading-4 text-black">
        ◆ Start small. Try one simple question first to see how it works.
      </Text>

      <Text className="ml-1 text-sm leading-4 text-black">
        ◆ Be specific. &quot;What are the key findings?&quot; beats &quot;tell
        me stuff.&quot;
      </Text>

      <Text className="ml-1 text-sm leading-4 text-black">
        ◆ Refine as you go. Follow up to dig deeper into any answer.
      </Text>

      <Section className="my-6">
        <Button
          href={`${domain}/${organization.slug}/${namespace.slug}/playground`}
        >
          Open Playground
        </Button>
      </Section>
    </DefaultLayout>
  );
}

export default DataReadyEmail;
