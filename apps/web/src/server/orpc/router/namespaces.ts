import { namespaceIdPathSchema } from "@/schemas/api/params";
import {
  createNamespaceSchema,
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import {
  api,
  protectedProcedure,
  requireMember,
  requireNamespace,
  requireRoles,
  successSchema,
} from "@/server/orpc/base";
import { createNamespace } from "@/services/namespaces/create";
import { deleteNamespace } from "@/services/namespaces/delete";
import { updateNamespace } from "@/services/namespaces/update";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { NamespaceStatus } from "@agentset/db";
import { db } from "@agentset/db/client";
import { getDemoTemplate } from "@agentset/demo";
import { triggerSeedDemoNamespace } from "@agentset/jobs";
import { prefixId } from "@agentset/utils";

import { makeCodeSamples, ts } from "./code-samples";

const list = api
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

const create = api
  .use(requireRoles("admin", "owner"))
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

const get = api
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

const updateHandler = api
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

const del = api
  .use(requireRoles("admin", "owner"))
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

  // ---------------------------------------------------------------------
  // Dashboard-only procedures — session auth, no REST/OpenAPI/MCP surface.
  // ---------------------------------------------------------------------
  getOrgNamespaces: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const member = await requireMember(context.session, {
        slug: input.slug,
      });

      const namespaces = await db.namespace.findMany({
        where: {
          organizationId: member.organizationId,
          status: NamespaceStatus.ACTIVE,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return namespaces;
    }),
  getNamespaceBySlug: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .handler(async ({ context, input }) => {
      const namespace = await db.namespace.findFirst({
        where: {
          slug: input.slug,
          organization: {
            slug: input.orgSlug,
            members: { some: { userId: context.session.user.id } },
          },
          status: NamespaceStatus.ACTIVE,
        },
      });

      return namespace;
    }),
  getOnboardingStatus: protectedProcedure
    .input(z.object({ orgSlug: z.string(), slug: z.string() }))
    .handler(async ({ context, input }) => {
      const namespace = await db.namespace.findFirst({
        where: {
          slug: input.slug,
          organization: {
            slug: input.orgSlug,
            members: { some: { userId: context.session.user.id } },
          },
          status: NamespaceStatus.ACTIVE,
        },
        select: {
          totalIngestJobs: true,
          totalPlaygroundUsage: true,
          organization: {
            select: {
              apiKeys: {
                take: 1,
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!namespace) {
        throw new ORPCError("NOT_FOUND");
      }

      return {
        ingestDocuments: namespace.totalIngestJobs > 0,
        playground: namespace.totalPlaygroundUsage > 0,
        createApiKey: namespace.organization.apiKeys.length > 0,
      };
    }),
  checkSlug: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        slug: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const namespace = await db.namespace.findUnique({
        where: {
          organizationId_slug: {
            slug: input.slug,
            organizationId: input.orgId,
          },
        },
      });

      return !!namespace;
    }),
  createDemoNamespace: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        templateId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireMember(
        context.session,
        { id: input.orgId },
        { roles: ["admin", "owner"] },
      );

      const template = getDemoTemplate(input.templateId);
      if (!template) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid template ID",
        });
      }

      const organization = await db.organization.findUnique({
        where: { id: input.orgId },
        select: { id: true, plan: true },
      });
      if (!organization) {
        throw new ORPCError("NOT_FOUND");
      }

      let slug: string = template.id;
      let suffix = 2;
      while (true) {
        const existing = await db.namespace.findUnique({
          where: {
            organizationId_slug: {
              organizationId: input.orgId,
              slug,
            },
          },
          select: { id: true },
        });

        if (!existing) break;

        slug = `${template.id}-${suffix}`;
        suffix += 1;
      }

      const [namespace] = await db.$transaction([
        db.namespace.create({
          data: {
            name: template.name,
            slug,
            demoId: template.id,
            organizationId: input.orgId,
            embeddingConfig: {
              provider: "MANAGED_OPENAI",
              model: "text-embedding-3-large",
            },
            vectorStoreConfig: {
              provider: "MANAGED_TURBOPUFFER",
            },
          },
        }),
        db.organization.update({
          where: { id: input.orgId },
          data: {
            totalNamespaces: { increment: 1 },
          },
        }),
      ]);

      await triggerSeedDemoNamespace(
        {
          namespaceId: namespace.id,
          organizationId: organization.id,
          templateId: template.id,
        },
        organization.plan,
      );

      return namespace;
    }),
};
