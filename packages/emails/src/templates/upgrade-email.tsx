import { Heading, Link, Text } from "@react-email/components";

import { DefaultLayout } from "../components/default-layout";
import { APP_DOMAIN } from "../domain";

export function UpgradeEmail({
  name = "John Doe",
  email = "john@doe.com",
  plan = {
    name: "Pro",
    features: [],
  },
  domain = APP_DOMAIN,
}: {
  name: string | null;
  email: string;
  plan: {
    name: string;
    features?: {
      text: string;
      disabled?: boolean;
      tooltip?: { title: string; cta: string; href: string };
    }[];
  };
  domain?: string;
}) {
  const finalFeatures = plan.features
    ? plan.features.filter((feature) => !feature.disabled)
    : [];

  return (
    <DefaultLayout
      preview={`Thank you for upgrading to Agentset ${plan.name}!`}
      footer={{ email, domain }}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Thank you for upgrading to Agentset {plan.name}!
      </Heading>

      <Text className="text-sm leading-6 text-black">
        Hey{name && ` ${name}`}!
      </Text>
      <Text className="text-sm leading-6 text-black">
        My name is Abdellatif, and I'm the co-founder of Agentset.
      </Text>
      <Text className="text-sm leading-6 text-black">
        I wanted to personally reach out to thank you for upgrading to{" "}
        <strong>Agentset {plan.name}</strong>! Your support means the world to
        us and helps us continue to build and improve Agentset.
      </Text>
      {finalFeatures.length > 0 ? (
        <>
          <Text className="text-sm leading-6 text-black">
            On the {plan.name} plan, you now have access to:
          </Text>
          {finalFeatures.map((feature) => (
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆{" "}
              {feature.tooltip?.href ? (
                <Link href={feature.tooltip.href}>{feature.text}</Link>
              ) : (
                feature.text
              )}
            </Text>
          ))}
        </>
      ) : null}

      <Text className="text-sm leading-6 text-black">
        If you have any questions or feedback about Agentset, please don't
        hesitate to reach out – I'm always happy to help!
      </Text>

      <Text className="text-sm leading-6 font-light text-neutral-400">
        Abdellatif from Agentset
      </Text>
    </DefaultLayout>
  );
}

export default UpgradeEmail;
