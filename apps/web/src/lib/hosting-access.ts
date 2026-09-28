/** Whether the email is on the hosting's allowed emails or email domains. */
export const isAllowedHostingEmail = (
  {
    allowedEmails,
    allowedEmailDomains,
  }: { allowedEmails: string[]; allowedEmailDomains: string[] },
  email: string,
) => {
  const emailDomain = email.split("@")[1] ?? "";
  return (
    allowedEmails.includes(email) || allowedEmailDomains.includes(emailDomain)
  );
};
