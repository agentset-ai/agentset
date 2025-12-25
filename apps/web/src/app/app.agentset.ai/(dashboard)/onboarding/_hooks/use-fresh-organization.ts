import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { generateToken, toSlug } from "@agentset/utils";

export function useFreshOrganization() {
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const suffix = generateToken(4).toLowerCase();

      const response = await authClient.organization.create({
        name,
        slug: toSlug(name, suffix),
      });

      if (!response.data) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      logEvent("organization_created", {
        slug: data.slug,
        name: data.name,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
