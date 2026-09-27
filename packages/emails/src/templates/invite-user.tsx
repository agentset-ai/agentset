import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { DefaultLayout } from "../components/default-layout";
import { APP_DOMAIN } from "../domain";

export function OrganizationInvite({
  email = "john@doe.com",
  url = "http://localhost:8888/api/auth/callback/email?callbackUrl=http%3A%2F%2Fapp.localhost%3A3000%2Flogin&token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&email=youremail@gmail.com",
  organizationName = "Acme",
  organizationUser = "Brendon Urie",
  organizationUserEmail = "panic@thedis.co",
  domain = APP_DOMAIN,
}: {
  email: string;
  url: string;
  organizationName: string;
  organizationUser?: string | null;
  organizationUserEmail: string;
  domain?: string;
}) {
  const emailLink = (
    <Link
      className="text-blue-600 no-underline"
      href={`mailto:${organizationUserEmail}`}
    >
      {organizationUserEmail}
    </Link>
  );

  return (
    <DefaultLayout
      preview={`Join ${organizationName} on Agentset`}
      footer={{ email, domain }}
    >
      <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
        Join {organizationName} on Agentset
      </Heading>
      {organizationUser || organizationUserEmail ? (
        <Text className="text-sm leading-6 text-black">
          {organizationUser ? (
            <>
              <strong>{organizationUser}</strong> ({emailLink})
            </>
          ) : (
            emailLink
          )}{" "}
          has invited you to join the <strong>{organizationName}</strong>{" "}
          organization on Agentset!
        </Text>
      ) : (
        <Text className="text-sm leading-6 text-black">
          You have been invited to join the <strong>{organizationName}</strong>{" "}
          organization on Agentset!
        </Text>
      )}

      <Section className="my-6">
        <Button
          className="rounded-full bg-black px-6 py-3 text-center text-sm font-semibold text-white no-underline"
          href={url}
        >
          Join Organization
        </Button>
      </Section>

      <Text className="text-sm leading-6 text-black">
        or copy and paste this URL into your browser:
      </Text>

      <Text className="max-w-sm flex-wrap font-medium break-words text-purple-600 no-underline">
        {url.replace(/^https?:\/\//, "")}
      </Text>
    </DefaultLayout>
  );
}

export default OrganizationInvite;
