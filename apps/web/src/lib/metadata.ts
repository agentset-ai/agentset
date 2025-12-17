import type { Metadata } from "next";

import { APP_DOMAIN } from "./constants";

export function constructMetadata({
  title,
  fullTitle,
  description = "The open-source RAG platform: built-in citations, deep research, 22+ file formats, partitions, MCP server, and more.",
  image = "https://agentset.ai/og/cover.png",
  video,
  icons,
  url,
  canonicalUrl,
  noIndex = false,
  manifest,
}: {
  title?: string;
  fullTitle?: string;
  description?: string;
  image?: string | null;
  video?: string | null;
  icons?: Metadata["icons"];
  url?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  manifest?: string | URL | null;
} = {}): Metadata {
  return {
    title: fullTitle || (title ? `${title} | Agentset` : "Agentset Console"),
    description,
    icons: icons || [
      {
        rel: "apple-touch-icon",
        sizes: "32x32",
        url: "/icons/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/icons/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/icons/favicon-16x16.png",
      },
    ],
    openGraph: {
      title,
      description,
      ...(image && {
        images: image,
      }),
      url,
      ...(video && {
        videos: video,
      }),
    },
    twitter: {
      title,
      description,
      ...(image && {
        card: "summary_large_image",
        images: [image],
      }),
      ...(video && {
        player: video,
      }),
    },
    // icons,
    metadataBase: new URL(APP_DOMAIN),
    ...((url || canonicalUrl) && {
      alternates: {
        canonical: url || canonicalUrl,
      },
    }),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    ...(manifest && {
      manifest,
    }),
  };
}
