import { z } from "zod/v4";

// mirrors the slug validation in the create/update organization UI forms
export const organizationSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

export const OrganizationSchema = z
  .object({
    id: z.string().describe("The unique ID of the organization."),
    name: z.string().describe("The name of the organization."),
    slug: z.string().describe("The slug of the organization."),
    plan: z.string().describe("The plan of the organization."),
    createdAt: z
      .date()
      .describe("The date and time the organization was created."),
    usage: z
      .object({
        searchUsage: z
          .number()
          .describe("The number of searches used in the current cycle."),
        searchLimit: z
          .number()
          .describe("The maximum number of searches allowed per cycle."),
        totalPages: z
          .number()
          .describe("The total number of pages ingested by the organization."),
        pagesLimit: z
          .number()
          .describe("The maximum number of pages allowed on the current plan."),
        apiRatelimit: z
          .number()
          .describe("The API rate limit of the organization."),
      })
      .describe("The usage and limits of the organization."),
  })
  .meta({
    id: "organization",
    title: "Organization",
  });

export const updateOrganizationSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: organizationSlugSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.slug !== undefined, {
    message: "At least one field must be provided",
  });

export const OrganizationMemberSchema = z
  .object({
    id: z.string().describe("The unique ID of the member."),
    role: z.string().describe("The role of the member."),
    user: z.object({
      name: z.string().describe("The name of the member."),
      email: z.string().describe("The email of the member."),
    }),
    createdAt: z
      .date()
      .describe("The date and time the member joined the organization."),
  })
  .meta({
    id: "organization-member",
    title: "Organization Member",
  });

export const OrganizationInvitationSchema = z
  .object({
    id: z.string().describe("The unique ID of the invitation."),
    email: z.string().describe("The email the invitation was sent to."),
    role: z
      .string()
      .nullable()
      .default(null)
      .describe("The role the invitee will have once they accept."),
    status: z.string().describe("The status of the invitation."),
    expiresAt: z.date().describe("The date and time the invitation expires."),
  })
  .meta({
    id: "organization-invitation",
    title: "Organization Invitation",
  });

export const OrganizationMembersSchema = z
  .object({
    members: z
      .array(OrganizationMemberSchema)
      .describe("The members of the organization."),
    invitations: z
      .array(OrganizationInvitationSchema)
      .describe("The pending invitations to the organization."),
  })
  .meta({
    id: "organization-members",
    title: "Organization Members",
  });
