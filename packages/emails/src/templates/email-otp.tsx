import { Section, Text } from "@react-email/components";

import { DefaultLayout } from "../components/default-layout";

const OTPEmail = ({
  code = "123456",
  email = "john@doe.com",
}: {
  code: string;
  email: string;
}) => {
  return (
    <DefaultLayout
      preview="Login to Agentset"
      footer={{ email, domain: "https://app.agentset.ai" }}
    >
      <Text className="text-sm leading-6 text-black">
        Your confirmation code is below - enter it in your open browser window
        and we'll help you get signed in.
      </Text>

      <Section className="my-7 rounded bg-neutral-100 py-6">
        <Text className="text-center align-middle text-3xl leading-[24px]">
          {code}
        </Text>
      </Section>

      <Text className="text-sm leading-6 text-black">
        Please note: This email contains a code that should only be used by you.
        Do not forward this email.
      </Text>
    </DefaultLayout>
  );
};

export default OTPEmail;
