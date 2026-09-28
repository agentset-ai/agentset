// Dashboard URL used for links in emails. Read directly rather than through
// ./env so templates also render without the Resend key (e.g. in previews).
export const APP_DOMAIN = process.env.APP_DOMAIN || "https://app.agentset.ai";
