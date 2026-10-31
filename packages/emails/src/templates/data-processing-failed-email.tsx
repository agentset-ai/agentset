import { Heading, Section, Text } from "@react-email/components";

import { Button } from "../components/button";
import { DefaultLayout } from "../components/default-layout";

export function DataProcessingFailedEmail({
  email = "john@doe.com",
  namespace = {
    name: "My Namespace",
    slug: "my-namespace",
  },
  organization = {
    name: "Acme, Inc",
    slug: "acme",
  },
  error = "Failed to process documents",
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
  error: string;
  domain?: string;
}) {
  return (
    <DefaultLayout
      preview="There was an issue processing your data"
      footer={{ email, domain }}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        There was an issue processing your data
      </Heading>

      <Text className="text-sm leading-6 text-black">
        <strong>{namespace.name}</strong> on{" "}
        <a href="https://agentset.ai" className="text-black underline">
          agentset.ai
        </a>{" "}
        ran into an issue while processing your data.
      </Text>

      <Text className="text-sm leading-6 text-black">
        <strong>Error:</strong> {error}
      </Text>

      <Text className="text-sm leading-6 text-black">
        Head over to your documents page to review the details and retry if
        needed.
      </Text>

      <Section className="my-6">
        <Button
          href={`${domain}/${organization.slug}/${namespace.slug}/documents`}
        >
          View Documents
        </Button>
      </Section>
    </DefaultLayout>
  );
}

export default DataProcessingFailedEmail;
