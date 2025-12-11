import type { CreateEmailOptions } from "resend";
import { env } from "@/env";
import { render } from "@react-email/render";
import { Resend } from "resend";

import { APP_DOMAIN } from "./constants";

export const resend = new Resend(env.RESEND_API_KEY);

interface ResendEmailOptions extends Omit<CreateEmailOptions, "to" | "from"> {
  email: string;
  from?: string;
  variant?: "primary" | "notifications" | "marketing";
}

const VARIANT_TO_FROM_MAP = {
  primary: "Agentset.ai <system@agentset.ai>",
  notifications: "Agentset.ai <notifications@agentset.ai>", // TODO: change domain to mail.
  marketing: "Abdellatif from Agentset.ai <contact@agentset.ai>", // TODO: change domain to ship.
};

export const sendEmail = async (opts: ResendEmailOptions) => {
  const {
    email,
    from,
    variant = "primary",
    bcc,
    replyTo,
    subject,
    text,
    react,
    scheduledAt,
  } = opts;

  if (env.NODE_ENV === "development" && (text || react)) {
    const emailText =
      text || (await render(react as React.ReactElement, { plainText: true }));
    // log to console
    console.log(
      `Sending email to ${email} from ${from || VARIANT_TO_FROM_MAP[variant]}`,
    );
    console.log(emailText);
    return;
  }

  return await resend.emails.send({
    to: email,
    from: from || VARIANT_TO_FROM_MAP[variant],
    bcc: bcc,
    replyTo: replyTo || "support@agentset.ai",
    subject: subject!,
    text,
    react,
    scheduledAt,
    ...(variant === "marketing" && {
      headers: {
        "List-Unsubscribe": `${APP_DOMAIN}/account/settings`,
      },
    }),
  });
};
