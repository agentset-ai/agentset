import { z } from "zod/v4";

import { languageCode } from "../language";

export const youtubePayloadSchema = z
  .object({
    type: z.literal("YOUTUBE"),
    urls: z
      .array(
        z.url({
          hostname: /^(www\.youtube\.com|youtu\.be)$/,
        }),
      )
      .min(1)
      .describe(
        "The URLs of videos, channels, or playlists (hostname must be www.youtube.com or youtu.be).",
      ),
    transcriptLanguages: z
      .array(languageCode)
      .describe(
        "We will try to fetch the first available transcript in the given languages. Default is `en`.",
      )
      .optional(),
    includeMetadata: z
      .boolean()
      .describe(
        "Whether to include metadata in the ingestion (like video description, tags, category, duration, etc...). Defaults to `false`.",
      )
      .optional(),
  })
  .meta({
    id: "youtube-payload",
    title: "Youtube Payload",
  });
