import type { CreateEmailOptions } from "resend";
import { Resend } from "resend";

import { env } from "./env";

const resend = new Resend(env.RESEND_API_KEY);

const APP_DOMAIN = env.APP_DOMAIN ?? "https://app.agentset.ai";

interface SendEmailOptions extends Omit<CreateEmailOptions, "to" | "from"> {
  email: string;
  from?: string;
  variant?: "primary" | "notifications" | "marketing";
}

const VARIANT_TO_FROM_MAP = {
  primary: "Agentset.ai <system@agentset.ai>",
  notifications: "Agentset.ai <notifications@agentset.ai>",
  marketing: "Abdellatif from Agentset.ai <contact@agentset.ai>",
};

export const sendEmail = async (opts: SendEmailOptions) => {
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
