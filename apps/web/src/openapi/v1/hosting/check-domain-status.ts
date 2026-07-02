import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { DomainStatusSchema } from "@/schemas/api/hosting";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema } from "../utils";

export const checkDomainStatus: ZodOpenApiOperationObject = {
  operationId: "checkDomainStatus",
  "x-speakeasy-name-override": "checkDomainStatus",
  summary: "Retrieve custom domain status",
  description:
    "Retrieve the DNS configuration status of the custom domain attached to a namespace's hosting. If the domain is pending verification, a verification attempt is made automatically.",
  parameters: [namespaceIdPathSchema],
  responses: {
    "200": {
      description: "The domain status",
      content: {
        "application/json": {
          schema: successSchema(DomainStatusSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Hosting"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const status = await ns.hosting.checkDomainStatus();
console.log(status);
`,
  ),
};
