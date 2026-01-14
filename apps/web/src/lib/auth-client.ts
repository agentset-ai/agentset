import {
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./auth";
import { getBaseUrl } from "./utils";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient(),
    organizationClient(),
    magicLinkClient(),
    emailOTPClient(),
  ],
});
