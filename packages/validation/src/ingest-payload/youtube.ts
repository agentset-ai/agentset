import { z } from "zod/v4";

import { languageCode } from "../language";

const youtubeOptionsSchema = z
  .object({
    transcriptLanguages: z
      .array(languageCode)
      .describe(
        "We will try to fetch the first available transcript in the given languages. Default is `en`.",
      )
      .optional(),
  })
  .meta({
    id: "youtube-options",
    description: "Options to control how the youtube ingestion behaves.",
  });

export const youtubePayloadSchema = z
  .object({
    type: z.literal("YOUTUBE"),
    urls: z
      .array(
        z.url({
          hostname: /^(www\.youtube\.com|youtu\.be)$/,
        }),
      )
      .describe(
        "The URLs of videos, channels, or playlists (hostname must be www.youtube.com or youtu.be).",
      ),
    options: youtubeOptionsSchema.optional(),
  })
  .meta({
    id: "youtube-payload",
    title: "Youtube Payload",
  });
