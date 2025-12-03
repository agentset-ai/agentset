import { z } from "zod/v4";

import {
  filePayloadSchema,
  managedFilePayloadSchema,
  textPayloadSchema,
} from "../ingest-payload";

// remove name from the payload since it's a separate field
export const documentPayloadSchema = z
  .discriminatedUnion("type", [
    textPayloadSchema.omit({ fileName: true }),
    filePayloadSchema.omit({ fileName: true }),
    managedFilePayloadSchema.omit({ fileName: true }),
    z.object({
      type: z.literal("CRAWLED_PAGE"),
      title: z.string().optional().describe("The title of the crawled page."),
      description: z
        .string()
        .optional()
        .describe("The description of the crawled page."),
      language: z
        .string()
        .optional()
        .describe("The language of the crawled page."),
    }),
    z.object({
      type: z.literal("YOUTUBE_VIDEO"),
      videoId: z.string().describe("The ID of the youtube video."),
      duration: z
        .number()
        .optional()
        .describe("The duration of the youtube video in seconds."),
    }),
  ])
  .describe("The source of the document.");

export type DocumentPayload = z.infer<typeof documentPayloadSchema>;

export const documentPropertiesSchema = z
  .object({
    fileSize: z.number().describe("The size of the file in bytes."),
    mimeType: z
      .string()
      .describe("The MIME type of the file.")
      .nullable()
      .default(null),
  })
  .describe("The properties of the document.");

export type DocumentProperties = z.infer<typeof documentPropertiesSchema>;
