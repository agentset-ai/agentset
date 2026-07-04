import { AgentsetApiError } from "@/lib/api/errors";
import { namespaceIdPathSchema } from "@/openapi/v1/utils";
import {
  addDomainSchema,
  DomainSchema,
  DomainStatusSchema,
  HostingSchema,
  updateHostingSchema,
} from "@/schemas/api/hosting";
import { publicApi, requireNamespace, successSchema } from "@/server/orpc/base";
import { addDomain as addDomainService } from "@/services/domains/add";
import { checkDomainStatus as checkDomainStatusService } from "@/services/domains/check-status";
import { removeDomain as removeDomainService } from "@/services/domains/remove";
import { deleteHosting } from "@/services/hosting/delete";
import { enableHosting } from "@/services/hosting/enable";
import { getHosting } from "@/services/hosting/get";
import { updateHosting } from "@/services/hosting/update";
import { z } from "zod/v4";

import { prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";

const get = publicApi
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}/hosting",
    operationId: "getHosting",
    summary: "Retrieve hosting configuration",
    description: "Retrieve the hosting configuration for a namespace.",
    tags: ["Hosting"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "get",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const hosting = await ns.hosting.get();
console.log(hosting);
`,
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(HostingSchema))
  .handler(async ({ context }) => {
    const hosting = await getHosting({ namespaceId: context.namespace.id });

    if (!hosting) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Hosting not found for this namespace.",
      });
    }

    return {
      success: true as const,
      data: {
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      },
    };
  });

const enable = publicApi
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/hosting",
    successStatus: 201,
    operationId: "enableHosting",
    summary: "Enable hosting",
    description: "Enable hosting for a namespace.",
    tags: ["Hosting"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "enable",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const hosting = await ns.hosting.enable();
console.log(hosting);
`,
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(HostingSchema))
  .handler(async ({ context }) => {
    const hosting = await enableHosting({ namespaceId: context.namespace.id });

    return {
      success: true as const,
      data: {
        ...hosting,
        namespaceId: prefixId(hosting.namespaceId, "ns_"),
      },
    };
  });

const updateHandler = publicApi
  .input(updateHostingSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(HostingSchema))
  .handler(async ({ context, input }) => {
    // input carries the namespaceId path param too; updateHosting only reads
    // the updateHostingSchema body fields.
    const updatedHosting = await updateHosting({
      namespaceId: context.namespace.id,
      input,
    });

    return {
      success: true as const,
      data: {
        ...updatedHosting,
        namespaceId: prefixId(updatedHosting.namespaceId, "ns_"),
      },
    };
  });

const update = updateHandler.route({
  method: "PATCH",
  path: "/namespace/{namespaceId}/hosting",
  operationId: "updateHosting",
  summary: "Update hosting configuration",
  description:
    "Update the hosting configuration for a namespace. If there is no change, return it as it is.",
  tags: ["Hosting"],
  spec: (current) => ({
    ...current,
    "x-speakeasy-name-override": "update",
    "x-speakeasy-max-method-params": 1,
    security: [{ token: [] }],
    ...makeCodeSamples(
      ts`
const updatedHosting = await ns.hosting.update({
  title: "My Knowledge Base",
  welcomeMessage: "Welcome to my knowledge base!",
  searchEnabled: true,
});
console.log(updatedHosting);
`,
    ),
  }),
});

// legacy wire-compat alias, hidden from the generated spec
const updatePut = updateHandler.route({
  method: "PUT",
  path: "/namespace/{namespaceId}/hosting",
  tags: ["internal-alias"],
});

const del = publicApi
  .route({
    method: "DELETE",
    path: "/namespace/{namespaceId}/hosting",
    successStatus: 204,
    operationId: "deleteHosting",
    summary: "Delete hosting configuration",
    description:
      "Delete the hosting configuration for a namespace. Also removes the attached custom domain, if any.",
    tags: ["Hosting"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "delete",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
await ns.hosting.delete();
console.log("Hosting deleted");
`,
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(z.void())
  .handler(async ({ context }) => {
    await deleteHosting({ namespaceId: context.namespace.id });
  });

const getHostingOrThrow = async (namespaceId: string) => {
  const hosting = await getHosting({ namespaceId });

  if (!hosting) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Hosting is not enabled for this namespace.",
    });
  }

  return hosting;
};

const checkDomainStatus = publicApi
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}/hosting/domain",
    operationId: "checkDomainStatus",
    summary: "Retrieve custom domain status",
    description:
      "Retrieve the DNS configuration status of the custom domain attached to a namespace's hosting. If the domain is pending verification, a verification attempt is made automatically.",
    tags: ["Hosting"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "checkDomainStatus",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const status = await ns.hosting.checkDomainStatus();
console.log(status);
`,
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(DomainStatusSchema))
  .handler(async ({ context }) => {
    const hosting = await getHostingOrThrow(context.namespace.id);

    if (!hosting.domain) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "No custom domain is set for this namespace.",
      });
    }

    const { status, response } = await checkDomainStatusService({
      hostingId: hosting.id,
    });

    return {
      success: true as const,
      // the Vercel responses omit fields when the domain is not found,
      // the schema defaults fill those in
      data: {
        domain: hosting.domain.slug,
        status,
        verified: status === "Valid Configuration",
        apexName: response.domainJson.apexName,
        verification: response.domainJson.verification,
        conflicts: response.configJson.conflicts,
        misconfigured: response.configJson.misconfigured,
      },
    };
  });

const addDomain = publicApi
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/hosting/domain",
    successStatus: 201,
    operationId: "addDomain",
    summary: "Add a custom domain",
    description:
      "Attach a custom domain to the hosting configuration of a namespace. Only one domain can be attached at a time.",
    tags: ["Hosting"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "addDomain",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const domain = await ns.hosting.addDomain({ domain: "docs.example.com" });
console.log(domain);
`,
      ),
    }),
  })
  .input(addDomainSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(DomainSchema))
  .handler(async ({ context, input }) => {
    const hosting = await getHostingOrThrow(context.namespace.id);

    const domain = await addDomainService({
      hostingId: hosting.id,
      domain: input.domain,
    });

    return { success: true as const, data: domain };
  });

const removeDomain = publicApi
  .route({
    method: "DELETE",
    path: "/namespace/{namespaceId}/hosting/domain",
    successStatus: 204,
    operationId: "removeDomain",
    summary: "Remove the custom domain",
    description:
      "Remove the custom domain attached to the hosting configuration of a namespace.",
    tags: ["Hosting"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "removeDomain",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
await ns.hosting.removeDomain();
console.log("Domain removed");
`,
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(z.void())
  .handler(async ({ context }) => {
    const hosting = await getHostingOrThrow(context.namespace.id);
    await removeDomainService({ hostingId: hosting.id });
  });

export const hostingRouter = {
  get,
  enable,
  update,
  updatePut,
  delete: del,
  checkDomainStatus,
  addDomain,
  removeDomain,
};
