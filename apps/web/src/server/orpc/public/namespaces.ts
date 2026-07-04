import { namespaceIdPathSchema } from "@/schemas/api/params";
import {
  createNamespaceSchema,
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import { publicApi, requireNamespace, successSchema } from "@/server/orpc/base";
import { createNamespace } from "@/services/namespaces/create";
import { deleteNamespace } from "@/services/namespaces/delete";
import { updateNamespace } from "@/services/namespaces/update";
import { z } from "zod/v4";

import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";

const list = publicApi
  .route({
    method: "GET",
    path: "/namespace",
    operationId: "listNamespaces",
    summary: "Retrieve a list of namespaces",
    description:
      "Retrieve a list of namespaces for the authenticated organization.",
    tags: ["Namespaces"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "list",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const namespaces = await agentset.namespaces.list();
console.log(namespaces);
`,
        { isNs: false },
      ),
    }),
  })
  .output(successSchema(z.array(NamespaceSchema)))
  .handler(async ({ context }) => {
    const namespaces = await db.namespace.findMany({
      where: {
        organizationId: context.organization.id,
        status: NamespaceStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true as const,
      data: namespaces.map((namespace) => ({
        ...namespace,
        id: prefixId(namespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      })),
    };
  });

const create = publicApi
  .route({
    method: "POST",
    path: "/namespace",
    successStatus: 201,
    operationId: "createNamespace",
    summary: "Create a namespace.",
    description: "Create a namespace for the authenticated organization.",
    tags: ["Namespaces"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "create",
      "x-speakeasy-usage-example": true,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const namespace = await agentset.namespaces.create({
  name: "My Knowledge Base",
  slug: "my-knowledge-base",
  // embeddingConfig: {...},
  // vectorStoreConfig: {...},
});
console.log(namespace);
`,
        { isNs: false },
      ),
    }),
  })
  .input(createNamespaceSchema)
  .output(successSchema(NamespaceSchema))
  .handler(async ({ context, input }) => {
    // TODO: check apiScope
    const namespace = await createNamespace({
      organizationId: context.organization.id,
      data: input,
    });

    return {
      success: true as const,
      data: {
        ...namespace,
        id: prefixId(namespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      },
    };
  });

const get = publicApi
  .route({
    method: "GET",
    path: "/namespace/{namespaceId}",
    operationId: "getNamespace",
    summary: "Retrieve a namespace",
    description: "Retrieve the info for a namespace.",
    tags: ["Namespaces"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "get",
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
const namespace = await agentset.namespaces.get("ns_xxx");
console.log(namespace);
`,
        { isNs: false },
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(NamespaceSchema))
  .handler(({ context }) => {
    return {
      success: true as const,
      data: {
        ...context.namespace,
        id: prefixId(context.namespace.id, "ns_"),
        organizationId: prefixId(context.namespace.organizationId, "org_"),
      },
    };
  });

const updateHandler = publicApi
  .input(updateNamespaceSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(successSchema(NamespaceSchema))
  .handler(async ({ context, input }) => {
    const updatedNamespace = await updateNamespace({
      namespaceId: context.namespace.id,
      organizationId: context.namespace.organizationId,
      data: { name: input.name, slug: input.slug },
    });

    return {
      success: true as const,
      data: {
        ...updatedNamespace,
        id: prefixId(updatedNamespace.id, "ns_"),
        organizationId: prefixId(context.namespace.organizationId, "org_"),
      },
    };
  });

const update = updateHandler.route({
  method: "PATCH",
  path: "/namespace/{namespaceId}",
  operationId: "updateNamespace",
  summary: "Update a namespace.",
  description:
    "Update a namespace for the authenticated organization. If there is no change, return it as it is.",
  tags: ["Namespaces"],
  spec: (current) => ({
    ...current,
    "x-speakeasy-name-override": "update",
    "x-speakeasy-max-method-params": 2,
    security: [{ token: [] }],
    ...makeCodeSamples(
      ts`
const updatedNamespace = await agentset.namespaces.update("ns_xxx", {
  name: "Updated Knowledge Base",
});
console.log(updatedNamespace);
`,
      { isNs: false },
    ),
  }),
});

// legacy wire-compat alias, hidden from the generated spec
const updatePut = updateHandler.route({
  method: "PUT",
  path: "/namespace/{namespaceId}",
  tags: ["internal-alias"],
});

const del = publicApi
  .route({
    method: "DELETE",
    path: "/namespace/{namespaceId}",
    successStatus: 204,
    operationId: "deleteNamespace",
    summary: "Delete a namespace.",
    description:
      "Delete a namespace for the authenticated organization. This will delete all the data associated with the namespace.",
    tags: ["Namespaces"],
    spec: (current) => ({
      ...current,
      "x-speakeasy-name-override": "delete",
      "x-speakeasy-max-method-params": 1,
      security: [{ token: [] }],
      ...makeCodeSamples(
        ts`
await agentset.namespaces.delete("ns_xxx");
console.log("Namespace queued for deletion");
`,
        { isNs: false },
      ),
    }),
  })
  .input(z.object({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(z.void())
  .handler(async ({ context }) => {
    // TODO: check apiScope
    await deleteNamespace({ namespaceId: context.namespace.id });
  });

export const namespacesRouter = {
  list,
  create,
  get,
  update,
  updatePut,
  delete: del,
};
