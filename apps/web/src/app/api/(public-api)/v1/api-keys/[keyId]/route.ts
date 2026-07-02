import { AgentsetApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { deleteApiKey } from "@/services/api-key/delete";

export const DELETE = withApiHandler(
  async ({ organization, params, headers }) => {
    const keyId = params.keyId;
    if (!keyId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid API key ID.",
      });
    }

    // scoped to the organization; a missing key throws P2025 which maps to a 404
    await deleteApiKey({ id: keyId, organizationId: organization.id });

    return new Response(null, { status: 204, headers });
  },
  { logging: { routeName: "DELETE /v1/api-keys/[keyId]" } },
);
