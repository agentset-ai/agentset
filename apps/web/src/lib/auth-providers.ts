import { REGION_FEATURES } from "@agentset/utils";

type SocialProviderEnv = {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

type ProviderCredentials = { clientId: string; clientSecret: string };

export const getSocialProviders = (
  env: SocialProviderEnv,
): { github: ProviderCredentials; google?: ProviderCredentials } => {
  const github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };

  if (
    !REGION_FEATURES.googleSignIn ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET
  ) {
    return { github };
  }

  return {
    github,
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  };
};

export const getTrustedProviders = (
  providers: ReturnType<typeof getSocialProviders>,
) => (providers.google ? ["google", "github"] : ["github"]);
